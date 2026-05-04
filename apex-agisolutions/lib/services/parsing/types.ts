export type BankName = "HDFC" | "ICICI" | "SBI" | "KOTAK" | "AXIS" | "OTHER";

export const SUPPORTED_BANKS: BankName[] = ["HDFC", "ICICI", "SBI", "KOTAK", "AXIS", "OTHER"];

export interface ParsedTransaction {
  id: string;
  statement_id: string;
  trial_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: "DEBIT" | "CREDIT";
  balance: number | null;
}

export type AmountFormat = "debit-credit-columns" | "unified-amount" | "signed-amount";
export type CommaFormat = "indian" | "western" | "none";

export interface BankParserConfig {
  bankName: BankName;
  headerKeywords: string[];
  maxPreambleRows: number;
  columnMap: {
    dateCols: string[];
    descCols: string[];
    debitCols: string[];
    creditCols: string[];
    balanceCols: string[];
    typeCols: string[];
    amtCols: string[];
  };
  amountFormat: AmountFormat;
  commaFormat: CommaFormat;
  dateFormats: string[];
  footerKeywords: string[];
}

export interface ColumnMappingResult {
  dateCol: string | null;
  descCol: string | null;
  debitCol: string | null;
  creditCol: string | null;
  balanceCol: string | null;
  typeCol: string | null;
  amtCol: string | null;
  headers: string[];
  headerRowIndex: number;
}
