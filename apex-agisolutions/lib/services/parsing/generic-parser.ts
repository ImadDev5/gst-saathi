import { BankParserConfig } from "./types";

export const genericConfig: BankParserConfig = {
  bankName: "OTHER",
  headerKeywords: ["date", "desc", "narration", "particular", "amount", "debit", "withdrawal", "credit", "deposit", "balance"],
  maxPreambleRows: 30,
  columnMap: {
    dateCols: ["Transaction Date", "Txn Date", "Value Date", "Post Date", "Trans Date", "Date"],
    descCols: ["Description", "Narration", "Particulars", "Remarks", "Narrative", "Transaction Details", "Details"],
    debitCols: ["Debit", "Withdrawal", "Dr", "Paid Out"],
    creditCols: ["Credit", "Deposit", "Cr", "Paid In"],
    balanceCols: ["Balance", "Closing Balance", "Run Bal"],
    typeCols: ["Type", "Dr/Cr", "Cr/Dr", "Indicator"],
    amtCols: ["Amount", "Txn Amount", "Transaction Amount"],
  },
  amountFormat: "debit-credit-columns",
  commaFormat: "western",
  dateFormats: ["YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", "MM/DD/YYYY"],
  footerKeywords: ["Total", "Opening Balance", "This is computer generated"],
};
