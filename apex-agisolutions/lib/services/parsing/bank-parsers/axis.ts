import { BankParserConfig } from "../types";

export const axisConfig: BankParserConfig = {
  bankName: "AXIS",
  headerKeywords: ["date", "particulars", "desc", "narration", "amount", "debit", "credit", "balance", "cheque", "ref"],
  maxPreambleRows: 4,
  columnMap: {
    dateCols: ["Date", "Transaction Date", "Txn Date", "Value Date", "Trans Date"],
    descCols: ["Particulars", "Description", "Narration", "Transaction Details", "Remarks"],
    debitCols: ["Debit", "Withdrawal", "Dr.", "DR", "Paid Out"],
    creditCols: ["Credit", "Deposit", "Cr.", "CR", "Paid In"],
    balanceCols: ["Balance", "Closing Balance", "Run Bal", "Available Balance"],
    typeCols: ["Type", "Dr/Cr", "CR/DR", "Indicator"],
    amtCols: ["Amount", "Txn Amount", "Transaction Amount"],
  },
  amountFormat: "debit-credit-columns",
  commaFormat: "indian",
  dateFormats: ["DD/MM/YYYY", "DD-MM-YYYY"],
  footerKeywords: ["Total", "Opening Balance", "This is computer generated", "Net Balance", "Statement Summary", "Page"],
};
