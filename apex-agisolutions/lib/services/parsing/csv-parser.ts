import Papa from "papaparse";
import { BankParserConfig, ParsedTransaction, ColumnMappingResult } from "./types";
import { genericConfig } from "./generic-parser";
import { getBankParser } from "./bank-parsers";
import { normalizeDate, cleanNumber, toPaiseWithinInteger, findColumn, detectHeaderRow, isFooterRow } from "./normalizer";

function resolveConfig(bankName: string): BankParserConfig {
  return getBankParser(bankName) || genericConfig;
}

function mapColumns(rawRows: string[][], config: BankParserConfig): ColumnMappingResult {
  const { headers, headerRowIndex } = detectHeaderRow(rawRows, config.headerKeywords, config.maxPreambleRows);
  const lower = headers.map(h => h.toLowerCase());

  return {
    dateCol: findColumn(lower, headers, config.columnMap.dateCols),
    descCol: findColumn(lower, headers, config.columnMap.descCols),
    debitCol: findColumn(lower, headers, config.columnMap.debitCols),
    creditCol: findColumn(lower, headers, config.columnMap.creditCols),
    balanceCol: findColumn(lower, headers, config.columnMap.balanceCols),
    typeCol: findColumn(lower, headers, config.columnMap.typeCols),
    amtCol: findColumn(lower, headers, config.columnMap.amtCols),
    headers,
    headerRowIndex,
  };
}

export function parseCSV(
  buffer: Buffer,
  statementId: string,
  trialId: string,
  bankName?: string,
): ParsedTransaction[] {
  const config = resolveConfig(bankName || "OTHER");
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");

  const rawParse = Papa.parse(text, {
    header: false,
    skipEmptyLines: true,
  });

  const rawRows = rawParse.data as string[][];
  if (!rawRows || rawRows.length === 0) return [];

  const mapping = mapColumns(rawRows, config);

  const getVal = (row: string[], colHeader: string | null) => {
    if (!colHeader) return null;
    const idx = mapping.headers.indexOf(colHeader);
    return idx >= 0 ? row[idx] : null;
  };

  const parsedRows: ParsedTransaction[] = [];
  let trIdx = 0;

  for (let i = mapping.headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];

    if (row.filter(c => c && c.trim() !== "").length === 0) continue;

    if (isFooterRow(row, config.footerKeywords)) break;

    const rawDate = getVal(row, mapping.dateCol);
    const description = getVal(row, mapping.descCol);
    if (!description || !rawDate || rawDate.trim() === "" || description.trim() === "") continue;

    let transactionType: "DEBIT" | "CREDIT" | null = null;
    let finalAmount = 0;

    if (mapping.debitCol || mapping.creditCol) {
      const dAmt = cleanNumber(getVal(row, mapping.debitCol), config.commaFormat);
      const cAmt = cleanNumber(getVal(row, mapping.creditCol), config.commaFormat);

      if (dAmt > 0) {
        transactionType = "DEBIT";
        finalAmount = dAmt;
      } else if (cAmt > 0) {
        transactionType = "CREDIT";
        finalAmount = cAmt;
      }
    } else if (mapping.amtCol) {
      const rawAmtStr = (getVal(row, mapping.amtCol) || "");
      let amt = cleanNumber(rawAmtStr, config.commaFormat);
      let isCredit = false;

      if (rawAmtStr.toLowerCase().includes("cr")) isCredit = true;
      else if (rawAmtStr.toLowerCase().includes("dr")) isCredit = false;
      else if (amt < 0) {
        isCredit = false;
      } else {
        isCredit = true;
      }

      if (mapping.typeCol) {
        const typeSign = (getVal(row, mapping.typeCol) || "").toLowerCase();
        if (typeSign.includes("dr") || typeSign.includes("debit")) isCredit = false;
        else if (typeSign.includes("cr") || typeSign.includes("credit")) isCredit = true;
      }

      amt = Math.abs(amt);
      if (amt > 0) {
        transactionType = isCredit ? "CREDIT" : "DEBIT";
        finalAmount = amt;
      }
    }

    if (!transactionType || finalAmount === 0) continue;

    const balanceRaw = getVal(row, mapping.balanceCol);
    const balance = balanceRaw ? toPaiseWithinInteger(cleanNumber(balanceRaw, config.commaFormat)) : null;

    parsedRows.push({
      id: `${statementId}_r${trIdx++}`,
      statement_id: statementId,
      trial_id: trialId,
      transaction_date: normalizeDate(rawDate),
      description: description.trim(),
      amount: Math.round(finalAmount * 100),
      transaction_type: transactionType,
      balance,
    });
  }

  return parsedRows;
}

export function parsePDF(
  buffer: Buffer,
  statementId: string,
  trialId: string,
  filename: string,
  bankName?: string,
): ParsedTransaction[] {
  const bankLabel = bankName ? ` (${bankName})` : "";
  return [
    {
      id: `${statementId}_pdf_meta`,
      statement_id: statementId,
      trial_id: trialId,
      transaction_date: new Date().toISOString().split("T")[0],
      description: `PDF${bankLabel}: ${filename}. Text extraction pending — re-upload as CSV for automatic processing.`,
      amount: 0,
      transaction_type: "DEBIT",
      balance: null,
    },
  ];
}
