const fs = require('fs');
const Papa = require('papaparse');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function parseCSV(buffer, statementId, trialId) {
  const content = buffer.toString("utf-8");
  const result = Papa.parse(content, { skipEmptyLines: true });
  if (result.errors.length && result.data.length === 0) {
    throw new Error("Failed to parse CSV: " + result.errors[0].message);
  }

  const rows = result.data;
  if (rows.length === 0) return [];
  const headerSearchLimit = Math.min(30, rows.length);
  let headerRowIndex = -1;
  let dateIdx = -1, descIdx = -1, debitIdx = -1, creditIdx = -1, amountIdx = -1, balanceIdx = -1;

  for (let i = 0; i < headerSearchLimit; i++) {
    const row = rows[i].map(c => String(c || "").toLowerCase().trim());
    dateIdx = row.findIndex(c => c.includes("date"));
    descIdx = row.findIndex(c => c.includes("narration") || c.includes("description") || c.includes("particulars"));
    debitIdx = row.findIndex(c => c === "withdrawal" || c === "debit" || c.includes("dr") || c.includes("withdrawal"));
    creditIdx = row.findIndex(c => c === "deposit" || c === "credit" || c.includes("cr") || c.includes("deposit"));
    amountIdx = row.findIndex(c => c === "amount" || c === "txn amount");
    balanceIdx = row.findIndex(c => c.includes("balance"));

    if (dateIdx !== -1 && descIdx !== -1 && ((debitIdx !== -1 && creditIdx !== -1) || amountIdx !== -1)) {
      headerRowIndex = i;
      break;
    }
  }
  return headerRowIndex;
}
console.log(parseCSV(fs.readFileSync('/workspaces/gst-saathi/business_bank_statement_sample.csv'), '1', '2'));
