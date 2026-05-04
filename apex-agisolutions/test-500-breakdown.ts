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

console.log(`\n${"=".repeat(80)}`);
console.log(`500-Transaction Business CSV — Full Breakdown`);
console.log(`${"=".repeat(80)}\n`);

const categories: Record<string, { count: number; amountTotal: number; examples: string[] }> = {};
for (const row of parsed.data) {
  const debit = parseFloat(row["Debit (INR)"]) || 0;
  const amountPaise = Math.round(debit * 100);
  if (debit <= 0) continue;

  const start = performance.now();
  const r = classifier.classify(row["Description"], amountPaise);
  performance.now();

  const key = `${r.itc_status} | ${r.category || "no_rule_match"}`;
  if (!categories[key]) {
    categories[key] = { count: 0, amountTotal: 0, examples: [] };
  }
  categories[key].count++;
  categories[key].amountTotal += amountPaise;
  if (categories[key].examples.length < 3) {
    categories[key].examples.push(
      `₹${debit.toFixed(0)} "${row["Description"].substring(0, 45)}"`,
    );
  }
}

// Group logically
console.log("=== ITC ELIGIBLE (classified by algorithm) ===\n");
let eligibleCount = 0;
let eligibleAmount = 0;
for (const [key, val] of Object.entries(categories)) {
  if (key.startsWith("ELIGIBLE")) {
    eligibleCount += val.count;
    eligibleAmount += val.amountTotal;
  }
}
console.log(`  ${eligibleCount} txns — ₹${(eligibleAmount / 100).toLocaleString("en-IN")}`);
for (const [key, val] of Object.entries(categories).sort((a, b) => b[1].count - a[1].count)) {
  if (key.startsWith("ELIGIBLE")) {
    console.log(`    ${val.count}x ${key.replace("ELIGIBLE | ", "")}`);
    for (const ex of val.examples) console.log(`      → ${ex}`);
  }
}

console.log(`\n=== BLOCKED (classified by algorithm) ===\n`);
let blockedCount = 0;
let blockedAmount = 0;
for (const [key, val] of Object.entries(categories)) {
  if (key.startsWith("BLOCKED")) {
    blockedCount += val.count;
    blockedAmount += val.amountTotal;
  }
}
console.log(`  ${blockedCount} txns — ₹${(blockedAmount / 100).toLocaleString("en-IN")}`);
for (const [key, val] of Object.entries(categories).sort((a, b) => b[1].count - a[1].count)) {
  if (key.startsWith("BLOCKED")) {
    console.log(`    ${val.count}x ${key.replace("BLOCKED | ", "")}`);
    for (const ex of val.examples) console.log(`      → ${ex}`);
  }
}

console.log(`\n=== RCM (classified by algorithm) ===\n`);
for (const [key, val] of Object.entries(categories).sort((a, b) => b[1].count - a[1].count)) {
  if (key.startsWith("RCM")) {
    console.log(`  ${val.count}x ${key.replace("RCM | ", "")}`);
    for (const ex of val.examples) console.log(`    → ${ex}`);
  }
}

console.log(`\n=== UNKNOWN — correctly non-ITC (Loan/Salary/Tax/Bank) ===\n`);
let correctUnknown = 0;
let correctUnknownAmount = 0;
for (const [key, val] of Object.entries(categories)) {
  if (key.startsWith("UNKNOWN") && (key.includes("Loan") || key.includes("Tax") || key.includes("Payroll") || key.includes("Interest") || key.includes("Statutory"))) {
    correctUnknown += val.count;
    correctUnknownAmount += val.amountTotal;
    console.log(`  ${val.count}x ${key.replace("UNKNOWN | ", "")}`);
    for (const ex of val.examples) console.log(`    → ${ex}`);
  }
}
console.log(`  → ${correctUnknown} txns correctly marked UNKNOWN (non-ITC by nature)`);

console.log(`\n=== UNKNOWN — needs AI/human (generic descriptions) ===\n`);
for (const [key, val] of Object.entries(categories).sort((a, b) => b[1].count - a[1].count)) {
  if (key.startsWith("UNKNOWN") && !(key.includes("Loan") || key.includes("Tax") || key.includes("Payroll") || key.includes("Interest") || key.includes("Statutory"))) {
    console.log(`  ${val.count}x ${key.replace("UNKNOWN | ", "")}`);
    for (const ex of val.examples) console.log(`    → ${ex}`);
  }
}

// Summary
const totalDebits = Object.values(categories).reduce((s, v) => s + v.count, 0);
let rcmCount = 0;
for (const [k, v] of Object.entries(categories)) {
  if (k.startsWith("RCM")) rcmCount += v.count;
}
const genericUnknown = totalDebits - eligibleCount - blockedCount - rcmCount - correctUnknown;
console.log(`\n${"=".repeat(80)}`);
console.log(`FINAL SUMMARY — ${totalDebits} DEBIT transactions from business_bank_statement_sample.csv`);
console.log(`${"=".repeat(80)}`);
console.log(`  ✅ ELIGIBLE (ready to claim ITC):          ${eligibleCount.toString().padStart(3)}  (${((eligibleCount/totalDebits)*100).toFixed(1)}%)`);
console.log(`  🚫 BLOCKED (Section 17(5)):                ${blockedCount.toString().padStart(3)}  (${((blockedCount/totalDebits)*100).toFixed(1)}%)`);
console.log(`  🔄 RCM (Reverse Charge):                   ${rcmCount.toString().padStart(3)}  (${((rcmCount/totalDebits)*100).toFixed(1)}%)`);
console.log(`  ❔ UNKNOWN — non-ITC (Loan/Salary/Tax):    ${correctUnknown.toString().padStart(3)}  (${((correctUnknown/totalDebits)*100).toFixed(1)}%)`);
console.log(`  ❓ UNKNOWN — needs AI/manual review:        ${genericUnknown.toString().padStart(3)}  (${((genericUnknown/totalDebits)*100).toFixed(1)}%)`);
console.log(`  ─────────────────────────────────────────`);
console.log(`  Algorithmic classified (non-UNKNOWN):      ${(eligibleCount + blockedCount + rcmCount + correctUnknown).toString().padStart(3)}  (${(((eligibleCount + blockedCount + rcmCount + correctUnknown)/totalDebits)*100).toFixed(1)}%)`);
console.log(`  Coverage includes correctly non-ITC items`);
console.log(`${"=".repeat(80)}\n`);
