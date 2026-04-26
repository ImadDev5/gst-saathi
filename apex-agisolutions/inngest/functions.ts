import { inngest } from "./client";
import { supabaseServer } from "@/lib/supabase/client";
import { VendorMatcher } from "@/lib/engine/vendor-matcher";
import { AIClassifier } from "@/lib/engine/ai-classifier";
import Papa from "papaparse";
import pdfParse from "pdf-parse";

export const processStatement = inngest.createFunction(
  {
    id: "process-statement",
    retries: 2,
    // Add onFailure to update the DB if all retries fail
    onFailure: async ({ event, error }) => {
      const statementId = event.data.event.data.statementId;
      await supabaseServer
        .from("statements")
        .update({
          status: "FAILED",
          error_message: error.message,
        })
        .eq("id", statementId);
    },
  },
  { event: "statements/uploaded" },
  async ({ event, step }) => {
    const { statementId, storagePath, trialId } = event.data;

    // Step 1: Download from Supabase Storage
    const { fileBuffer, isPDF } = await step.run("download-file", async () => {
      const { data, error } = await supabaseServer.storage
        .from("statements")
        .download(storagePath);

      if (error) {
        throw new Error(
          `Failed to download statement ${storagePath}: ${error.message}`,
        );
      }
      const isPDF = storagePath.toLowerCase().endsWith(".pdf");
      const fileBuffer = Buffer.from(await data.arrayBuffer());
      return { fileBuffer: fileBuffer.toString("base64"), isPDF };
    });

    // Step 2: Parse and Normalize File
    const transactions = await step.run("parse-and-normalize", async () => {
      const buffer = Buffer.from(fileBuffer, "base64");

      if (isPDF) {
        // Basic Text-Based PDF extraction (Phase 2A)
        const pdfData = await pdfParse(buffer);

        if (!pdfData.text || pdfData.text.trim().length < 50) {
          throw new Error(
            "Scanned PDFs not supported yet, please use CSV or a digital PDF",
          );
        }

        const lines = pdfData.text
          .split("\n")
          .filter((l) => l.trim().length > 0);
        // Naive parse for MVP: we expect the LLM or a regex pattern to extract lines properly later.
        // For MVP we just map each line to a "description" assuming it might be a transaction.
        // In real-world, we'd feed the entire text to AI or use a dedicated regex router.
        return lines
          .map((line, i) => ({
            id: `${statementId}_l${i}`,
            statement_id: statementId,
            trial_id: trialId,
            transaction_date: new Date().toISOString(),
            description: line.substring(0, 200), // restrict length
            amount: 0, // Fallback, would need NLP extraction
            transaction_type: "DEBIT",
            dedupe_hash: `pdf_temp_${Math.random()}`,
          }))
          .filter((t) => t.description.length > 5); // ignore short nonsense
      } else {
        // CSV Parsing
        const text = buffer.toString("utf-8");
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

        const rows = parsed.data as Record<string, string>[];
        return rows.map((row, i) => ({
          id: `${statementId}_r${i}`,
          statement_id: statementId,
          trial_id: trialId,
          transaction_date: new Date().toISOString(), // Mock mapped
          description: row.Narration || row.Description || "Unknown",
          amount: Math.round(parseFloat(row.Amount || "0") * 100), // convert to paise
          transaction_type: "DEBIT",
          dedupe_hash: `csv_temp_${Math.random()}`,
        }));
      }
    });

    // Step 3: Tier 1 - Engine Classification (Phase 1A logic)
    const classifiedTransactions = await step.run(
      "tier1-classify",
      async () => {
        const { data: vendors } = await supabaseServer
          .from("vendors")
          .select("id, name, keywords, itc_status, default_gst_rate");

        const vendorMatcher = new VendorMatcher(vendors || []);

        return transactions.map((t) => {
          let itc_status = "UNKNOWN";
          let gst_amount = 0;
          let vendor_id = null;
          let mapped_vendor_name = null;
          let block_reason = null;

          if (t.transaction_type === "DEBIT") {
            const match = vendorMatcher.match(t.description);
            if (match) {
              vendor_id = match.id;
              mapped_vendor_name = match.name;
              itc_status = match.itc_status;

              const rate = match.default_gst_rate || 18;
              const gstRatio = rate / (100 + rate);
              gst_amount = Math.round(t.amount * gstRatio);

              if (itc_status === "BLOCKED") {
                block_reason =
                  "Matched Vendor configured as Blocked Credit under S.17(5)";
              }
            }
          }

          return {
            ...t,
            vendor_id,
            mapped_vendor_name,
            itc_status,
            block_reason,
            gst_amount,
          };
        });
      },
    );

    // Step 4: Tier 2 - AI Classification for Unmatched (NVIDIA NIM)
    const finalTransactions = await step.run("tier2-ai-classify", async () => {
      const unmatched = classifiedTransactions.filter(
        (t) => t.itc_status === "UNKNOWN",
      );
      if (unmatched.length === 0) return classifiedTransactions;

      // Batch the unmatched (max 10 as per plan)
      const aiSubSet = unmatched.slice(0, 10).map((t) => ({
        id: t.id,
        description: t.description,
        amount: t.amount / 100, // to Rupees for LLM context
      }));

      const aiClassifier = new AIClassifier();
      const aiResults = await aiClassifier.classifyBatch(aiSubSet);

      // Re merge
      return classifiedTransactions
        .map((t) => {
          const aiMatch = aiResults.find(
            (r: {
              id: string;
              itc_status: string;
              mapped_vendor_name: string;
              block_reason: string | null;
              itc_confidence: number;
            }) => r.id === t.id,
          );
          if (aiMatch) {
            // Phase 2B rule: If confidence < 0.8, flag as UNKNOWN for manual review
            const isConfident =
              aiMatch.itc_confidence !== undefined &&
              aiMatch.itc_confidence >= 0.8;
            const finalStatus = isConfident ? aiMatch.itc_status : "UNKNOWN";

            return {
              ...t,
              mapped_vendor_name: isConfident
                ? aiMatch.mapped_vendor_name
                : t.mapped_vendor_name,
              itc_status: finalStatus,
              block_reason: aiMatch.block_reason || t.block_reason,
              // simplistic recalculation for AI-matched
              gst_amount:
                finalStatus === "ELIGIBLE" || finalStatus === "BLOCKED"
                  ? Math.round(t.amount * (18 / 118))
                  : 0,
            };
          }
          return t;
        })
        .map(({ id: _tempId, ...rest }) => rest); // strip temp id before insert
    });

    // Step 5: Batch Insert Transactions to Database
    await step.run("insert-transactions", async () => {
      const { error } = await supabaseServer
        .from("transactions")
        .insert(finalTransactions);

      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }
    });

    // Step 6: Mark Statement as Completed
    await step.run("mark-completed", async () => {
      await supabaseServer
        .from("statements")
        .update({ status: "COMPLETED" })
        .eq("id", statementId);
    });

    return { processedCount: finalTransactions.length };
  },
);

export const sendGstr3bReminders = inngest.createFunction(
  { id: "send-gstr3b-reminders" },
  { cron: "0 9 15 * *" }, // 9 AM on the 15th of every month
  async ({ step }) => {
    // 1. Fetch active trial (or actual user) sessions that need a reminder
    const activeSessions = await step.run("fetch-active-users", async () => {
      const { data, error } = await supabaseServer
        .from("trial_sessions")
        .select("id, token, status")
        .eq("status", "ACTIVE");

      if (error) throw new Error(error.message);
      return data || [];
    });

    // 2. Mock sending emails (since phase 2C just needs the skeleton)
    const emailsSent = await step.run("dispatch-reminders", async () => {
      let count = 0;
      for (const session of activeSessions) {
        // Here we would use resend/sendgrid
        console.log(
          `[GSTR-3B Reminder] Sending reminder to user with session: ${session.id}. Target date: 20th.`,
        );
        count++;
      }
      return count;
    });

    return { emailsDispatched: emailsSent };
  },
);
