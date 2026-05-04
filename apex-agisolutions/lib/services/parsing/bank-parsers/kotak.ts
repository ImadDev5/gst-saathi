import { BankParserConfig } from "../types";

export const kotakConfig: BankParserConfig = {
  bankName: "KOTAK",
  headerKeywords: ["date", "desc", "narration", "amount", "debit", "dr", "credit", "cr", "balance", "cheque", "ref"],
  maxPreambleRows: 4,
  columnMap: {
    dateCols: ["Transaction Date", "Date", "Txn Date", "Value Date", "Trans Date"],
    descCols: ["Transaction Description", "Description", "Narration", "Particulars", "Details"],
    debitCols: ["Dr.", "Debit", "Withdrawal", "DR", "Paid Out"],
    creditCols: ["Cr.", "Credit", "Deposit", "CR", "Paid In"],
    balanceCols: ["Balance", "Closing Balance", "Run Bal", "Available Balance"],
    typeCols: ["Type", "Dr/Cr", "CR/DR", "Indicator"],
    amtCols: ["Amount", "Txn Amount", "Transaction Amount"],
  },
  amountFormat: "debit-credit-columns",
  commaFormat: "indian",
  dateFormats: ["DD/MM/YYYY", "DD-MM-YYYY"],
  footerKeywords: ["Total", "Opening Balance", "This is computer generated", "Net Balance", "Statement Period", "Page"],
};
