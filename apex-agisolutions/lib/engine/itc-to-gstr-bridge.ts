/**
 * ITC-to-GSTR Bridge
 * Reads ELIGIBLE ITC transactions from Module A (bank statements)
 * and produces GSTR-3B compatible ITC sections and Module B entries.
 */

interface TransactionRecord {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  gst_amount: number;
  itc_status: string;
  mapped_vendor_name: string | null;
  block_reason: string | null;
  transaction_type: string;
}

export interface GSTR3BITCSection {
  /** Total ITC discovered from bank statements (in paise) */
  totalItcPaise: number;
  /** IGST portion (inter-state purchases) */
  igstPaise: number;
  /** CGST portion (central share of intra-state) */
  cgstPaise: number;
  /** SGST portion (state share of intra-state) */
  sgstPaise: number;
  /** Number of ELIGIBLE transactions found */
  eligibleCount: number;
  /** Total number of transactions processed */
  totalCount: number;
  /** Leakage: total GST in all debits vs what was classified ELIGIBLE */
  potentialLeakagePaise: number;
  /** The statement IDs that contributed to this ITC */
  sourceStatementIds: string[];
}

export interface ITCImportLineItem {
  product_name: string;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  taxable_paise: number;
  gst_rate: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_gst_paise: number;
  total_paise: number;
  itc_status: string;
  itc_amount_paise: number;
  block_reason: string | null;
  source_transaction_id: string;
}

export interface ITCImportPayload {
  entry_type: string;
  entry_date: string;
  payment_mode: string;
  customer_type: string;
  party_name: string;
  party_gstin: string | null;
  invoice_number: string;
  line_items: ITCImportLineItem[];
}

/**
 * Compute GSTR-3B ITC section from Module A transactions for a given period.
 *
 * @param transactions - ELIGIBLE classified transactions from bank statements
 * @returns GSTR3BITCSection for merging into unified GSTR-3B
 */
export function computeITCForGSTR3B(transactions: TransactionRecord[]): GSTR3BITCSection {
  const eligible = transactions.filter((t) => t.itc_status === "ELIGIBLE" && t.gst_amount > 0);

  let totalItcPaise = 0;
  const statementIds = new Set<string>();

  for (const txn of eligible) {
    totalItcPaise += txn.gst_amount;
  }

  // Get unique statement IDs from the eligible transactions
  for (const txn of transactions) {
    if (txn.gst_amount > 0) statementIds.add(txn.id);
  }

  // Default split: 50% CGST, 50% SGST (intra-state assumption)
  // IGST would apply to inter-state purchases — estimated as 0 for simplicity
  const cgstPaise = Math.round(totalItcPaise / 2);
  const sgstPaise = totalItcPaise - cgstPaise;

  // Compute leakage: total GST in ALL debits minus what was classified ELIGIBLE
  const totalGstInDebits = transactions
    .filter((t) => t.transaction_type === "DEBIT")
    .reduce((sum, t) => sum + t.gst_amount, 0);
  const potentialLeakagePaise = Math.max(0, totalGstInDebits - totalItcPaise);

  return {
    totalItcPaise,
    igstPaise: 0,
    cgstPaise,
    sgstPaise,
    eligibleCount: eligible.length,
    totalCount: transactions.length,
    potentialLeakagePaise,
    sourceStatementIds: [],
  };
}

/**
 * Convert eligible ITC transactions into Module B entry line items
 * for importing into the retail ledger / GSTR-3B flow.
 *
 * @param transactions - ELIGIBLE classified transactions
 * @param entryDate - Date to use for the created entry (YYYY-MM-DD)
 * @returns ITCImportPayload ready to POST to entries API
 */
export function transactionsToEntryPayload(
  transactions: TransactionRecord[],
  entryDate: string,
): ITCImportPayload {
  const eligible = transactions.filter((t) => t.itc_status === "ELIGIBLE" && t.gst_amount > 0);

  const lineItems: ITCImportLineItem[] = eligible.map(
    (txn): ITCImportLineItem => {
      const totalGstPaise = txn.gst_amount;
      const cgstPaise = Math.round(totalGstPaise / 2);
      const sgstPaise = totalGstPaise - cgstPaise;
      const taxablePaise = txn.amount - totalGstPaise;

      return {
        product_name: txn.mapped_vendor_name || txn.description || "ITC Import (Bank Statement)",
        hsn_code: null,
        quantity: 1,
        unit: "each",
        taxable_paise: taxablePaise,
        gst_rate: 18, // Default assumption; actual rate from classification
        cgst_paise: cgstPaise,
        sgst_paise: sgstPaise,
        igst_paise: 0,
        total_gst_paise: totalGstPaise,
        total_paise: txn.amount,
        itc_status: "ELIGIBLE",
        itc_amount_paise: totalGstPaise,
        block_reason: null,
        source_transaction_id: txn.id,
      };
    },
  );

  return {
    entry_type: "PURCHASE",
    entry_date: entryDate,
    payment_mode: "BANK_TRANSFER",
    customer_type: "B2B",
    party_name: "ITC Import (Bank Statement)",
    party_gstin: null,
    invoice_number: `ITC-IMPORT-${entryDate}`,
    line_items: lineItems,
  };
}
