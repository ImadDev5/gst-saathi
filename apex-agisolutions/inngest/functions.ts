import { inngest } from "./client";
import { supabaseServer } from "@/lib/supabase/client";
import { VendorMatcher } from "@/lib/engine/vendor-matcher";
import Papa from "papaparse";

export const processStatement = inngest.createFunction(
  { id: "process-statement" },
  { event: "statements/uploaded" },
  async ({ event, step }) => {
    const { statementId, storagePath, trialId } = event.data;

    // Step 1: Download from Supabase Storage
    const fileData = await step.run("download-csv", async () => {
      const { data, error } = await supabaseServer.storage
        .from("statements")
        .download(storagePath);
      
      if (error) {
        throw new Error(`Failed to download statement ${storagePath}: ${error.message}`);
      }
      return await data.text();
    });

    // Step 2: Parse and Normalize CSV
    const transactions = await step.run("parse-and-normalize", async () => {
      const parsed = Papa.parse(fileData, { header: true, skipEmptyLines: true });
      
      // TODO: Apply bank-specific extractors and normalizers here
      // For now, mapping a generalized structure
      const rows = parsed.data as Record<string, string>[];
      return rows.map((row) => ({
        statement_id: statementId,
        trial_id: trialId,
        transaction_date: new Date().toISOString(), // Mock mapped
        description: row.Narration || row.Description || "Unknown",
        amount: Math.round(parseFloat(row.Amount || "0") * 100), // convert to paise
        transaction_type: "DEBIT",
        dedupe_hash: `temp_${Math.random()}`, // replace with actual SHA
      }));
    });

    // Step 3: AI/Engine Classification (Phase 1A logic)
    const classifiedTransactions = await step.run("classify-transactions", async () => {
      // 3a. Pre-load Vendors library
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
            
            // Simple generic back-calculation of GST (e.g. at 18%) for MVP estimation
            const rate = match.default_gst_rate || 18;
            // Reverse calculate: total = base + (base * rate/100) -> base = total / (1 + rate/100)
            const gstRatio = rate / (100 + rate);
            gst_amount = Math.round(t.amount * gstRatio);
            
            if (itc_status === "BLOCKED") {
               block_reason = "Matched Vendor configured as Blocked Credit under S.17(5)";
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
    });

    // Step 4: Batch Insert Transactions to Database
    await step.run("insert-transactions", async () => {
      const { error } = await supabaseServer
        .from("transactions")
        .insert(classifiedTransactions);
      
      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }
    });

    // Step 5: Mark Statement as Completed
    await step.run("mark-completed", async () => {
      await supabaseServer
        .from("statements")
        .update({ status: "COMPLETED" })
        .eq("id", statementId);
    });

    return { processedCount: classifiedTransactions.length };
  }
);