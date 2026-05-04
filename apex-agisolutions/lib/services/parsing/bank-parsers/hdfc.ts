import { BankParserConfig } from "../types";

export const hdfcConfig: BankParserConfig = {
  bankName: "HDFC",
  headerKeywords: ["date", "desc", "narration", "amount", "debit", "withdrawal", "credit", "deposit", "balance"],
  maxPreambleRows: 5,
  columnMap: {
    dateCols: ["Transaction Date", "Date", "Txn Date", "Value Date", "Post Date"],
    descCols: ["Description", "Narration", "Transaction Description", "Particulars", "Remarks"],
    debitCols: ["Withdrawal (INR)", "Withdrawal Amt.", "Withdrawal", "Debit", "Dr.", "Paid Out"],
    creditCols: ["Deposit (INR)", "Deposit Amt.", "Deposit", "Credit", "Cr.", "Paid In"],
    balanceCols: ["Balance (INR)", "Closing Balance", "Balance", "Run Bal"],
    typeCols: ["Type", "Dr/Cr", "Cr/Dr", "Indicator"],
    amtCols: ["Amount", "Txn Amount", "Transaction Amount"],
  },
  amountFormat: "debit-credit-columns",
  commaFormat: "indian",
  dateFormats: ["DD/MM/YYYY", "DD-MM-YYYY"],
  footerKeywords: ["Total", "Opening Balance", "Closing Balance", "This is computer generated", "Net Balance", "Statement Summary"],
};
