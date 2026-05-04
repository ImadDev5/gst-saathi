import { BankParserConfig } from "../types";

export const iciciConfig: BankParserConfig = {
  bankName: "ICICI",
  headerKeywords: ["date", "desc", "narration", "amount", "debit", "withdrawal", "credit", "deposit", "balance", "cheque", "ref"],
  maxPreambleRows: 5,
  columnMap: {
    dateCols: ["Tran Date", "Transaction Date", "Date", "Value Date", "Txn Date"],
    descCols: ["Transaction Description", "Description", "Transaction Details", "Narration", "Particulars"],
    debitCols: ["Withdrawal(Dr)", "Withdrawal (INR)", "Withdrawal", "Debit", "Dr.", "Withdrawal Amt."],
    creditCols: ["Deposit(Cr)", "Deposit (INR)", "Deposit", "Credit", "Cr.", "Deposit Amt."],
    balanceCols: ["Balance", "Balance (INR)", "Closing Balance", "Run Bal"],
    typeCols: ["Dr/Cr", "Cr/Dr", "Type", "Indicator"],
    amtCols: ["Amount", "Txn Amount", "Transaction Amount"],
  },
  amountFormat: "debit-credit-columns",
  commaFormat: "indian",
  dateFormats: ["DD/MM/YYYY", "DD-MM-YYYY", "DD-Mon-YYYY"],
  footerKeywords: ["Total", "Opening Balance", "This is computer generated", "Net Balance", "Statement Summary", "Page"],
};
