/**
 * Parser verification script — tests bank-specific CSV parsing.
 * Run with: npx ts-node --project tsconfig.json test-parser.ts
 * 
 * Since ts-node has ESM resolution issues with this project, we use a workaround:
 * This file directly imports the types and calls the core parsing engine.
 */
import { parseCSV } from "./lib/services/parsing/csv-parser";
import * as fs from "fs";
import * as path from "path";

const TEST_DATA_DIR = path.resolve(__dirname, "test-data");

interface TestCase {
  bank: string;
  file: string;
  expectedMinTxns: number;
}

const testCases: TestCase[] = [
  { bank: "HDFC", file: "hdfc-statement.csv", expectedMinTxns: 10 },
  { bank: "ICICI", file: "icici-statement.csv", expectedMinTxns: 10 },
  { bank: "SBI", file: "sbi-statement.csv", expectedMinTxns: 10 },
  { bank: "KOTAK", file: "kotak-statement.csv", expectedMinTxns: 10 },
  { bank: "AXIS", file: "axis-statement.csv", expectedMinTxns: 10 },
];

let passed = 0;
let failed = 0;
const errors: string[] = [];

for (const tc of testCases) {
  const filePath = path.join(TEST_DATA_DIR, tc.file);
  console.log(`\n=== Testing ${tc.bank} (${tc.file}) ===`);

  if (!fs.existsSync(filePath)) {
    errors.push(`${tc.bank}: File not found: ${filePath}`);
    failed++;
    continue;
  }

  const buffer = fs.readFileSync(filePath);
  const result = parseCSV(buffer, "test-stmt", "test-trial", tc.bank);

  // Check transaction count
  if (result.length < tc.expectedMinTxns) {
    errors.push(
      `${tc.bank}: Expected at least ${tc.expectedMinTxns} transactions, got ${result.length}`
    );
    failed++;
    continue;
  }
  console.log(`  OK Parsed ${result.length} transactions`);

  // Check transaction types
  const debits = result.filter(t => t.transaction_type === "DEBIT");
  const credits = result.filter(t => t.transaction_type === "CREDIT");
  if (debits.length === 0) {
    errors.push(`${tc.bank}: No DEBIT transactions found`);
    failed++;
    continue;
  }
  if (credits.length === 0) {
    errors.push(`${tc.bank}: No CREDIT transactions found`);
    failed++;
    continue;
  }
  console.log(`  OK Transaction types: ${debits.length} DEBIT, ${credits.length} CREDIT`);

  // Spot-check sample
  const first = result[0];
  console.log(`  OK Date: ${first.transaction_date}`);
  console.log(`  OK Description: "${first.description.substring(0, 80)}..."`);
  console.log(`  OK Amount: ${first.amount} paise`);
  console.log(`  OK Type: ${first.transaction_type}`);

  passed++;
}

console.log("\n========================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log("\nErrors:");
  errors.forEach(e => console.log(`  ERR ${e}`));
  process.exit(1);
}
console.log("All bank parsers working correctly!");
