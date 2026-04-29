import { inngest } from "./client";
import { supabaseServer } from "@/lib/supabase/client";
import { VendorMatcher } from "@/lib/engine/vendor-matcher";
import { AIClassifier } from "@/lib/engine/ai-classifier";
import { detectRCM } from "@/lib/engine/rcm-detector";
import { reverseCalculateGST } from "@/lib/engine/gst-calculator";
import { dedupHash } from "@/lib/dedup-hash";
import Papa from "papaparse";

interface ParsedTransaction {
  id: string;
  statement_id: string;
  trial_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: "DEBIT" | "CREDIT";
  balance: number | null;
}

interface ClassifiedTransaction extends ParsedTransaction {
  vendor_id: string | null;
  mapped_vendor_name: string | null;
  itc_status: string;
  gst_amount: number;
  block_reason: string | null;
  action_required: string | null;
  confidence: number;
  rcm_type: string | null;
  dedupe_hash: string;
}

const PG_INT_MAX = 2147483647;
const PG_INT_MIN = -2147483648;

interface UploadedStatementEventData {
  statementId: string;
  storagePath: string;
  trialId: string;
  filename: string;
  bankName: string;
}

interface StepRunner {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

const inlineStepRunner: StepRunner = {
  run: async <T>(_name: string, fn: () => Promise<T>) => fn(),
};

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function statementExists(statementId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from("statements")
    .select("id")
    .eq("id", statementId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify statement ${statementId}: ${error.message}`,
    );
  }

  return Boolean(data);
}

export async function runStatementPipeline(
  eventData: UploadedStatementEventData,
  step: StepRunner = inlineStepRunner,
) {
  const { statementId, storagePath, trialId, filename } = eventData;

  const existsAtStart = await step.run("ensure-statement-exists", async () =>
    statementExists(statementId),
  );

  if (!existsAtStart) {
    console.warn(`Skipping deleted statement ${statementId} before processing.`);
    return {
      statementId,
      transactionCount: 0,
      insertedCount: 0,
      skipped: true,
    };
  }

  const { fileBuffer, isPDF } = await step.run("download-file", async () => {
    const { data, error } = await supabaseServer.storage
      .from("statements")
      .download(storagePath);

    if (error) {
      throw new Error(
        `Failed to download statement ${storagePath}: ${error.message}`,
      );
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return {
      fileBuffer: buffer.toString("base64"),
      isPDF: storagePath.toLowerCase().endsWith(".pdf"),
    };
  });

  const transactions: ParsedTransaction[] = await step.run(
    "parse-and-normalize",
    async () => {
      const buffer = Buffer.from(fileBuffer, "base64");
      return isPDF
        ? parsePDF(buffer, statementId, trialId, filename)
        : parseCSV(buffer, statementId, trialId);
    },
  );

  const tier1Results: ClassifiedTransaction[] = await step.run(
    "tier1-classify",
    async () => {
      const { data: vendors } = await supabaseServer
        .from("vendors")
        .select(
          "id, name, keywords, itc_status, default_gst_rate, category, is_oidar",
        );

      const vendorMatcher = new VendorMatcher(vendors || []);

      return transactions.map((t) => {
        const result: ClassifiedTransaction = {
          ...t,
          vendor_id: null,
          mapped_vendor_name: null,
          itc_status: "UNKNOWN",
          gst_amount: 0,
          block_reason: null,
          action_required: null,
          confidence: 0.5,
          rcm_type: null,
          dedupe_hash: dedupHash(
            statementId,
            t.transaction_date,
            t.description,
            t.amount,
          ),
        };

        if (t.transaction_type !== "DEBIT" || t.amount <= 0) {
          return result;
        }

        const matchedVendor = vendorMatcher.match(t.description);

        if (matchedVendor) {
          result.vendor_id = matchedVendor.id;
          result.mapped_vendor_name = matchedVendor.name;

          const narration = t.description.toUpperCase();
          const vendorIsOidar =
            (matchedVendor.category?.toUpperCase().includes("OIDAR") || false) ||
            (matchedVendor.is_oidar || false);

          const rcm = detectRCM(
            narration,
            t.amount,
            vendorIsOidar,
            vendorIsOidar,
            matchedVendor.category || null,
          );

          if (rcm.rcmApplicable) {
            result.itc_status = "RCM";
            result.gst_amount = rcm.rcmAmountPaise;
            result.rcm_type = rcm.rcmType;
            result.block_reason = null;
            result.action_required = "Pay RCM tax; claim ITC in same month";
            result.confidence = 0.9;
          } else {
            const vendorStatus = matchedVendor.itc_status;

            if (vendorStatus === "BLOCKED") {
              result.itc_status = "BLOCKED";
              result.block_reason =
                "Matched Vendor configured as Blocked Credit under S.17(5)";
              result.confidence = 0.95;
            } else if (vendorStatus === "RCM") {
              result.itc_status = "RCM";
              result.action_required = "Pay RCM tax; claim ITC in same month";
              result.confidence = 0.9;
            } else {
              result.itc_status =
                vendorStatus === "ELIGIBLE" ? "ELIGIBLE" : "UNKNOWN";
              result.confidence =
                vendorStatus === "ELIGIBLE" ? 0.85 : 0.5;

              if (result.itc_status === "ELIGIBLE") {
                result.action_required = "Verify in GSTR-2B portal";
              }
            }

            const gstRate = matchedVendor.default_gst_rate || 18;
            if (result.itc_status !== "UNKNOWN") {
              result.gst_amount = reverseCalculateGST(t.amount, gstRate);
            }
          }
        }

        return result;
      });
    },
  );

  // Tier 2: AI classification — process each batch as its own checkpointed step
  // This ensures each batch survives Vercel Hobby's 10s function timeout
  let finalTransactions: ClassifiedTransaction[] = tier1Results;

  const { unmatched, batchSize, maxAITotal, rateLimitDelayMs, maxEmptyBatches } =
    await step.run("tier2-ai-config", async () => {
      const unmatched = tier1Results.filter(
        (t) => t.itc_status === "UNKNOWN" && t.transaction_type === "DEBIT",
      );
      return {
        unmatched,
        batchSize: readPositiveIntEnv("NVIDIA_NIM_BATCH_SIZE", 20),
        maxAITotal: readPositiveIntEnv("NVIDIA_NIM_MAX_AI_TOTAL", 1000),
        rateLimitDelayMs: readPositiveIntEnv(
          "NVIDIA_NIM_RATE_LIMIT_DELAY_MS",
          2500,
        ),
        maxEmptyBatches: readPositiveIntEnv(
          "NVIDIA_NIM_MAX_EMPTY_BATCHES",
          1,
        ),
      };
    });

  if (unmatched.length > 0) {
    let aiClassified = 0;
    let emptyBatchCount = 0;
    const totalBatches = Math.ceil(unmatched.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      if (aiClassified >= maxAITotal) break;

      const start = batchIndex * batchSize;
      const batch = unmatched.slice(start, start + batchSize);

      const aiResults = await step.run(
        `ai-batch-${batchIndex + 1}`,
        async () => {
          const aiClassifier = new AIClassifier();
          return aiClassifier.classifyBatch(
            batch.map((t) => ({
              id: t.id,
              description: t.description,
              amount: t.amount / 100,
            })),
          );
        },
      );

      if (aiResults.length === 0) {
        emptyBatchCount++;
        console.warn(
          `AI batch ${batchIndex + 1} returned empty; leaving as UNKNOWN.`,
        );
        if (emptyBatchCount >= maxEmptyBatches) {
          console.warn("Stopping AI after repeated empty batches.");
          break;
        }
      } else {
        emptyBatchCount = 0;
      }

      // Merge AI results into the main results array
      for (const aiMatch of aiResults) {
        const txn = finalTransactions.find((t) => t.id === aiMatch.id);
        if (!txn) continue;

        const isConfident =
          aiMatch.itc_confidence !== undefined &&
          aiMatch.itc_confidence >= 0.8;
        if (!isConfident) continue;

        const validStatuses = [
          "ELIGIBLE",
          "BLOCKED",
          "CONDITIONAL",
          "RCM",
          "UNKNOWN",
        ];
        const aiStatus = validStatuses.includes(aiMatch.itc_status)
          ? aiMatch.itc_status
          : "UNKNOWN";

        txn.itc_status = aiStatus;
        txn.mapped_vendor_name =
          aiMatch.mapped_vendor_name || txn.mapped_vendor_name;
        txn.block_reason = aiMatch.block_reason || txn.block_reason;
        txn.confidence = aiMatch.itc_confidence;

        if (aiStatus === "ELIGIBLE" || aiStatus === "BLOCKED") {
          txn.gst_amount = reverseCalculateGST(txn.amount, 18);
        }
      }

      aiClassified += batch.length;

      // Rate limit delay between batches (except after the last one)
      if (aiClassified < maxAITotal && batchIndex < totalBatches - 1) {
        await step.run(
          `ai-delay-${batchIndex + 1}`,
          async () =>
            new Promise((resolve) => setTimeout(resolve, rateLimitDelayMs)),
        );
      }
    }
  }

  const existsBeforeInsert = await step.run(
    "ensure-statement-before-insert",
    async () => statementExists(statementId),
  );

  if (!existsBeforeInsert) {
    console.warn(`Skipping insert for deleted statement ${statementId}.`);
    return {
      statementId,
      transactionCount: finalTransactions.length,
      insertedCount: 0,
      skipped: true,
    };
  }

  const insertCount = await step.run("insert-transactions", async () => {
    const rows = finalTransactions.map(({ id: _id, ...rest }) => rest);
    const chunkSize = 100;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabaseServer
        .from("transactions")
        .upsert(chunk, {
          onConflict: "dedupe_hash",
          ignoreDuplicates: true,
        });

      if (error) {
        throw new Error(
          `Failed to insert transactions at chunk ${i}: ${error.message}`,
        );
      }

      inserted += chunk.length;
    }

    return inserted;
  });

  const existsBeforeComplete = await step.run(
    "ensure-statement-before-complete",
    async () => statementExists(statementId),
  );

  if (!existsBeforeComplete) {
    console.warn(`Statement ${statementId} was deleted after insert.`);
    return {
      statementId,
      transactionCount: finalTransactions.length,
      insertedCount: insertCount,
      skipped: true,
    };
  }

  await step.run("mark-completed", async () => {
    const { error } = await supabaseServer
      .from("statements")
      .update({
        status: "COMPLETED",
        error_message: null,
      })
      .eq("id", statementId);

    if (error) {
      throw new Error(
        `Failed to mark statement ${statementId} as completed: ${error.message}`,
      );
    }
  });

  return {
    statementId,
    transactionCount: finalTransactions.length,
    insertedCount: insertCount,
  };
}

export const processStatement = inngest.createFunction(
  {
    id: "process-statement-v4",
    retries: 2,
    concurrency: 3,
    triggers: [{ event: "statements/uploaded" }],
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
  async ({
    event,
    step,
  }: {
    event: { data: UploadedStatementEventData };
    step: StepRunner;
  }) => runStatementPipeline(event.data, step),
);

function findColumn(lower: string[], original: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const cLower = c.toLowerCase();
    const matchIdx = lower.findIndex(h => {
      if (h === cLower) return true;
      if (cLower.length <= 3) {
         return new RegExp(`\\b${cLower}\\b`).test(h);
      }
      return h.includes(cLower) || cLower.includes(h);
    });
    if (matchIdx >= 0) return original[matchIdx];
  }
  return null;
}

function normalizeDate(raw: string): string {
  if (!raw) return new Date().toISOString().split("T")[0];
  const cleaned = raw.trim().replace(/\s+/g, " ");

  // DD-MMM-YYYY or DD MMM YYYY or DD/MMM/YYYY
  let m = cleaned.match(/^(\d{1,2})[- \/]+([A-Za-z]{3,})[- \/]+(\d{2,4})/);
  if (m) {
    const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const month = months[m[2].substring(0, 3).toLowerCase()] || "01";
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${month}-${m[1].padStart(2, "0")}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  m = cleaned.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;

  // DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  m = cleaned.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    let d = parseInt(m[1], 10);
    let mo = parseInt(m[2], 10);
    if (mo > 12 && d <= 12) {
      [d, mo] = [mo, d];
    }
    const month = mo <= 12 ? mo : 1; 
    return `${year}-${month.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];

  return new Date().toISOString().split("T")[0];
}

export function parseCSV(
  buffer: Buffer,
  statementId: string,
  trialId: string,
): ParsedTransaction[] {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");

  // Read as array of arrays first to find headers (bypassing preamble)
  const rawParse = Papa.parse(text, {
    header: false,
    skipEmptyLines: true,
  });

  const rawRows = rawParse.data as string[][];
  if (!rawRows || rawRows.length === 0) return [];

  // Determine header row dynamically by looking for common column names 
  let headerRowIndex = 0;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(30, rawRows.length); i++) {
    const rowLow = rawRows[i].map(c => (c || "").toLowerCase().replace(/[^a-z0-9]/g, ""));
    const matchScore = rowLow.filter(c => 
      c.includes("date") || 
      c.includes("desc") || 
      c.includes("narration") || 
      c.includes("particular") || 
      c.includes("amount") || 
      c.includes("debit") || 
      c.includes("withdrawal") ||
      c.includes("credit") || 
      c.includes("deposit") ||
      c.includes("balance")
    ).length;

    // If we find at least 3 matching header-like columns, this is likely the header row
    if (matchScore >= 3 || (matchScore >= 2 && rawRows[i].length >= 3)) {
      headerRowIndex = i;
      headers = rawRows[i].map(h => h ? h.trim() : "");
      break;
    }
  }

  // Fallback if no clear header found
  if (headers.length === 0) {
    headerRowIndex = 0;
    headers = rawRows[0].map(h => h ? h.trim() : "");
  }

  const lower = headers.map(h => h.toLowerCase());

  // Detect exact mapping using fuzzy approach
  const dateCol = findColumn(lower, headers, ["transaction date", "txn date", "value date", "post date", "trans date", "date"]);
  const descCol = findColumn(lower, headers, ["description", "narration", "particulars", "remarks", "narrative", "transaction details", "details"]);
  
  // Debit / Credit splitting vs Combined Amount
  const parsedRows: ParsedTransaction[] = [];
  
  const debitCol = findColumn(lower, headers, ["debit", "withdrawal", "dr", "paid out"]);
  const creditCol = findColumn(lower, headers, ["credit", "deposit", "cr", "paid in"]);
  
  // Fallback for unified "Amount" column
  const amtCol = findColumn(lower, headers, ["amount", "txn amount", "transaction amount"]);
  // Sometimes bank provide sign in separate col "Dr/Cr"
  const typeCol = findColumn(lower, headers, ["type", "dr/cr", "cr/dr", "indicator"]);

  const balanceCol = findColumn(lower, headers, ["balance", "closing balance", "run bal"]);

  // We map index to easily get row values
  const getVal = (row: string[], colHeader: string | null) => {
    if (!colHeader) return null;
    const idx = headers.indexOf(colHeader);
    return idx >= 0 ? row[idx] : null;
  };

  const cleanNum = (val: string | null) => {
    if (!val) return 0;
    // Remove "Cr" or "Dr" text inside amount strings sometimes
    const clean = val.replace(/cr/i, "").replace(/dr/i, "").replace(/[^0-9.-]/g, "");
    return parseFloat(clean) || 0;
  };

  const toPaiseWithinInteger = (value: number): number | null => {
    const paise = Math.round(value * 100);

    if (paise > PG_INT_MAX || paise < PG_INT_MIN) {
      return null;
    }

    return paise;
  };

  // Parse data rows
  let trIdx = 0;
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    
    // Skip completely empty rows
    if (row.filter(c => c && c.trim() !== "").length === 0) continue;

    const rawDate = getVal(row, dateCol);
    const description = getVal(row, descCol);
    if (!description || !rawDate || rawDate.trim() === "" || description.trim() === "") continue;

    let transactionType: "DEBIT" | "CREDIT" | null = null;
    let finalAmount = 0;

    // Prioritize explicit debit / credit columns
    if (debitCol || creditCol) {
      const dAmt = cleanNum(getVal(row, debitCol));
      const cAmt = cleanNum(getVal(row, creditCol));
      
      if (dAmt > 0) {
        transactionType = "DEBIT";
        finalAmount = dAmt;
      } else if (cAmt > 0) {
        transactionType = "CREDIT";
        finalAmount = cAmt;
      }
    } 
    // Fallback to unified Amount column
    else if (amtCol) {
      const rawAmtStr = (getVal(row, amtCol) || "");
      let amt = cleanNum(rawAmtStr);
      let isCredit = false;

      // check if sign is implicit in raw string "1,000 Cr."
      if (rawAmtStr.toLowerCase().includes("cr")) isCredit = true;
      else if (rawAmtStr.toLowerCase().includes("dr")) isCredit = false;
      // or explicit minus sign for debit (some banks do positive debit, others negative debit)
      // Standard: positive amount = credit, negative amount = debit
      else if (amt < 0) {
        isCredit = false;
      } else {
        isCredit = true; 
      }

      // override if explicit type column exists
      if (typeCol) {
        const typeSign = (getVal(row, typeCol) || "").toLowerCase();
        if (typeSign.includes("dr") || typeSign.includes("debit")) isCredit = false;
        else if (typeSign.includes("cr") || typeSign.includes("credit")) isCredit = true;
      }

      amt = Math.abs(amt);
      if (amt > 0) {
        transactionType = isCredit ? "CREDIT" : "DEBIT";
        finalAmount = amt;
      }
    }

    if (!transactionType || finalAmount === 0) continue;

    const balanceRaw = getVal(row, balanceCol);
    const balance = balanceRaw ? toPaiseWithinInteger(cleanNum(balanceRaw)) : null;

    parsedRows.push({
      id: `${statementId}_r${trIdx++}`,
      statement_id: statementId,
      trial_id: trialId,
      transaction_date: normalizeDate(rawDate),
      description: description.trim(),
      amount: Math.round(finalAmount * 100),
      transaction_type: transactionType,
      balance,
    });
  }

  return parsedRows;
}

function parsePDF(
  buffer: Buffer,
  statementId: string,
  trialId: string,
  filename: string,
): ParsedTransaction[] {
  return [
    {
      id: `${statementId}_pdf_meta`,
      statement_id: statementId,
      trial_id: trialId,
      transaction_date: new Date().toISOString().split("T")[0],
      description: `PDF: ${filename}. Text extraction pending — re-upload as CSV for automatic processing.`,
      amount: 0,
      transaction_type: "DEBIT",
      balance: null,
    },
  ];
}

export const sendGstr3bReminders = inngest.createFunction(
  {
    id: "send-gstr3b-reminders",
    triggers: [{ cron: "0 9 15 * *" }],
  },
  async ({ step }: { step: any }) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Fetch contacts with active trial sessions that have transactions this month
    const recipients = await step.run("fetch-recipients", async () => {
      const { data: sessions, error } = await supabaseServer
        .from("trial_sessions")
        .select("id, token")
        .eq("status", "ACTIVE");

      if (error) throw new Error(error.message);

      const { data: contacts } = await supabaseServer
        .from("contacts")
        .select("name, email, business_name, assigned_token")
        .not("assigned_token", "is", null);

      const activeTokens = new Set(
        (sessions || []).map((s) => s.token),
      );

      return (contacts || [])
        .filter((c) => c.email && c.assigned_token && activeTokens.has(c.assigned_token))
        .map((c) => ({
          name: c.name || "User",
          email: c.email!,
          business: c.business_name || "Your Business",
        }));
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "reminders@apexagisolutions.com";
    let sent = 0;

    for (const recipient of recipients) {
      await step.run(`send-email-${recipient.email}`, async () => {
        if (!resendApiKey) {
          console.log(
            `[GSTR-3B Reminder] Would email ${recipient.email} — RESEND_API_KEY not configured.`,
          );
          return;
        }

        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        await resend.emails.send({
          from: fromEmail,
          to: recipient.email,
          subject: `GSTR-3B Filing Reminder — ${month}/${year}`,
          html: `
            <p>Hi ${recipient.name},</p>
            <p>This is a reminder that the <strong>GSTR-3B return for ${month}/${year}</strong> is due by the <strong>20th of this month</strong>.</p>
            <p>Use GSTSaathi to reconcile your bank statements and prepare your filing:</p>
            <p><a href="https://gstsaathi.apexagisolutions.com/dashboard">Open GSTSaathi Dashboard</a></p>
            <p>— Apex AGI Solutions</p>
          `,
        });
        sent++;
      });
    }

    return { recipients: recipients.length, emailsSent: sent };
  },
);