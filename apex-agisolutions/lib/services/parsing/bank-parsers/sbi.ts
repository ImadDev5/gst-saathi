import { BankParserConfig } from "../types";

export const sbiConfig: BankParserConfig = {
  bankName: "SBI",
  headerKeywords: ["date", "desc", "narration", "amount", "debit", "credit", "balance", "ref", "cheque"],
  maxPreambleRows: 6,
  columnMap: {
    dateCols: ["Txn Date", "Transaction Date", "Date", "Value Date", "Trans Date"],
    descCols: ["Description", "Narration", "Particulars", "Transaction Details", "Remarks"],
    debitCols: ["Debit", "Withdrawal", "Dr.", "DR", "Paid Out"],
    creditCols: ["Credit", "Deposit", "Cr.", "CR", "Paid In"],
    balanceCols: ["Balance", "Closing Balance", "Run Bal", "Available Balance"],
    typeCols: ["Dr/Cr", "CR/DR", "Type", "Indicator"],
    amtCols: ["Amount", "Txn Amount", "Transaction Amount"],
  },
  amountFormat: "debit-credit-columns",
  commaFormat: "none",
  dateFormats: ["DD-MM-YYYY", "DD/MM/YYYY"],
  footerKeywords: ["Total", "Opening Balance", "This is computer generated", "Net Balance", "Branch Code", "Account Summary", "I/We certify"],
};
