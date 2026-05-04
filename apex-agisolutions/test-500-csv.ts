import { readFileSync } from "fs";
import Papa from "papaparse";
import { AlgorithmicClassifier } from "./lib/engine/algorithmic-classifier";

interface CsvRow {
  Date: string;
  "Transaction ID": string;
  Description: string;
  "Debit (INR)": string;
  "Credit (INR)": string;
  "Balance (INR)": string;
}

const classifier = new AlgorithmicClassifier();

const raw = readFileSync("../business_bank_statement_sample.csv", "utf-8");
const parsed = Papa.parse<CsvRow>(raw, { header: true, skipEmptyLines: true });

console.log(`\nTotal rows: ${parsed.data.length}\n`);

const results: Array<{
  id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  confidence: number;
  category: string | null;
  vendor: string | null;
  elapsedMs: number;
}> = [];

for (const row of parsed.data) {
  const debit = parseFloat(row["Debit (INR)"]) || 0;
  const credit = parseFloat(row["Credit (INR)"]) || 0;
  const txnType = debit > 0 ? "DEBIT" : credit > 0 ? "CREDIT" : "SKIP";
  if (txnType === "SKIP") continue;

  const amountPaise = Math.round((debit > 0 ? debit : credit) * 100);

  const start = performance.now();
  const result = classifier.classify(row["Description"], amountPaise);
  const elapsed = performance.now() - start;

  results.push({
    id: row["Transaction ID"],
    description: row["Description"],
    amount: amountPaise,
    type: txnType,
    status: result.itc_status,
    confidence: result.itc_confidence,
    category: result.category,
    vendor: result.mapped_vendor_name,
    elapsedMs: Math.round(elapsed * 100) / 100,
  });
}

// Summary
const byStatus: Record<string, number> = {};
const byCategory: Record<string, number> = {};
let totalMs = 0;
const unknowns: typeof results = [];

for (const r of results) {
  byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const cat = r.category || "no_match";
  byCategory[cat] = (byCategory[cat] || 0) + 1;
  totalMs += r.elapsedMs;
  if (r.status === "UNKNOWN" && r.type === "DEBIT") unknowns.push(r);
}

console.log("=".repeat(80));
console.log("Transaction Status Distribution");
console.log("=".repeat(80));
for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / results.length) * 100).toFixed(1);
  console.log(`  ${status.padEnd(14)} ${String(count).padStart(4)}  (${pct}%)`);
}

console.log("\n" + "=".repeat(80));
console.log("DEBIT Only Status Distribution (what matters for ITC)");
console.log("=".repeat(80));
const debits = results.filter((r) => r.type === "DEBIT");
const debitByStatus: Record<string, number> = {};
for (const r of debits) {
  debitByStatus[r.status] = (debitByStatus[r.status] || 0) + 1;
}
for (const [status, count] of Object.entries(debitByStatus).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / debits.length) * 100).toFixed(1);
  console.log(`  ${status.padEnd(14)} ${String(count).padStart(4)}  (${pct}%)`);
}

console.log("\n" + "=".repeat(80));
console.log("Performance Stats");
console.log("=".repeat(80));
const sorted = [...results].sort((a, b) => b.elapsedMs - a.elapsedMs);
console.log(`  Total time: ${totalMs.toFixed(1)}ms`);
console.log(`  Average:    ${(totalMs / results.length).toFixed(3)}ms`);
console.log(`  P50:        ${sorted[Math.floor(sorted.length / 2)].elapsedMs.toFixed(2)}ms`);
console.log(`  P95:        ${sorted[Math.floor(sorted.length * 0.95)].elapsedMs.toFixed(2)}ms`);
console.log(`  P99:        ${sorted[Math.floor(sorted.length * 0.99)].elapsedMs.toFixed(2)}ms`);
console.log(`  Max:        ${sorted[0].elapsedMs.toFixed(2)}ms`);

if (unknowns.length > 0) {
  console.log("\n" + "=".repeat(80));
  console.log(`DEBIT + UNKNOWN Transactions (${unknowns.length} — needs AI/Manual)`);
  console.log("=".repeat(80));
  for (const u of unknowns.slice(0, 25)) {
    const amount = (u.amount / 100).toFixed(2);
    console.log(
      `  ${u.id.padEnd(12)} ₹${amount.padStart(8)} | ${u.description.substring(0, 55)}`,
    );
  }
  if (unknowns.length > 25) {
    console.log(`  ... and ${unknowns.length - 25} more`);
  }
}

// Show classification rate
const classifiedDebits = debits.filter((r) => r.status !== "UNKNOWN");
console.log("\n" + "=".repeat(80));
console.log(`Algorithmic classification rate on DEBIT transactions:`);
console.log(`  Classified: ${classifiedDebits.length}/${debits.length} (${((classifiedDebits.length / debits.length) * 100).toFixed(1)}%)`);
console.log("=".repeat(80));
