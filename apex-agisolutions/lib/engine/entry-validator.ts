/**
 * Entry Validator — Business Rules Engine for Module B v2
 * Applies all 8 business rules on every POST/PUT entry operation.
 *
 * Rules:
 *  1. GST rate auto-fill from product master (with override confirmation)
 *  2. ₹1,000 garment threshold auto-upgrade
 *  3. Section 17(5) ITC block
 *  4. IGST vs CGST+SGST split via GSTIN state codes
 *  5. RCM detection for foreign vendors / no Indian GSTIN
 *  6. Duplicate invoice detection
 *  7. Period lock (amendment generation)
 *  8. Time-barred ITC (past Nov 30 deadline)
 */

import { resolveThresholdRate } from "./gst-calculator";

export interface LineItemInput {
  product_id?: string | null;
  product_name: string;
  hsn_code?: string | null;
  quantity: number;
  unit?: string;
  rate_paise: number;            // GST-inclusive per-unit rate (user enters this)
  gst_rate: number;
  is_price_sensitive?: boolean;
  threshold_paise?: number;
  product_category?: string | null;
}

export interface ValidatedLineItem extends LineItemInput {
  amount_paise: number;          // rate × qty
  taxable_paise: number;         // back-calculated
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_gst_paise: number;
  total_paise: number;
  itc_status: 'ELIGIBLE' | 'BLOCKED' | 'RCM' | 'NEEDS_INVOICE' | 'TIME_BARRED' | 'PERSONAL' | 'UNKNOWN';
  itc_amount_paise: number;
  block_reason: string | null;
  warnings: string[];            // soft warnings to display
}

export interface EntryValidationInput {
  entry_type: 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN';
  entry_date: string;            // YYYY-MM-DD
  payment_mode: 'CASH' | 'ONLINE' | 'CREDIT';
  customer_type: 'B2C' | 'B2B';
  party_name?: string | null;
  party_gstin?: string | null;
  invoice_number?: string | null;
  business_gstin: string | null; // merchant's own GSTIN
  line_items: LineItemInput[];
}

export interface EntryValidationResult {
  valid: boolean;
  errors: string[];              // hard blocks (reject entry)
  warnings: string[];            // soft warnings (display, user can proceed)
  validatedLineItems: ValidatedLineItem[];
  isInterState: boolean;
  rcmApplicable: boolean;
  rcmAmountPaise: number;
}

// Section 17(5) blocked categories and patterns
const BLOCKED_CATEGORIES = [
  'food', 'foods', 'beverage', 'restaurant', 'catering', 'canteen',
  'beauty', 'salon', 'cosmetic', 'spa',
  'gym', 'fitness', 'health club', 'club membership',
  'life insurance', 'health insurance',
  'motor vehicle', 'car', 'personal vehicle',
  'travel benefit', 'vacation', 'holiday package',
  'construction', 'building', 'works contract',
  'entertainment', 'cinema', 'movie',
];

const BLOCKED_PRODUCT_NAMES = [
  'insurance', 'life insurance', 'health insurance', 'mediclaim',
  'club membership', 'gym membership', 'fitness membership',
  'staff food', 'employee food', 'staff canteen', 'employee canteen',
  'personal vehicle', 'personal car', 'employee car',
  'party', 'entertainment', 'picnic', 'holiday',
];

// RCM foreign / OIDAR vendor patterns
const RCM_VENDOR_PATTERNS = [
  'google', 'meta', 'facebook', 'instagram', 'linkedin',
  'microsoft', 'azure', 'aws', 'amazon web services',
  'zoom', 'dropbox', 'slack', 'notion', 'figma',
  'adobe', 'canva', 'github', 'gitlab', 'atlassian',
  'hubspot', 'salesforce', 'stripe', 'twilio', 'sendgrid',
  'mailchimp', 'digitalocean', 'cloudflare', 'heroku', 'vercel',
  'netlify', 'datadog', 'sentry', 'godaddy', 'namecheap',
  'paypal', 'wise', 'shopify', 'zapier', 'airtable',
  'openai', 'anthropic', 'deepseek', 'perplexity',
];

/**
 * Rule 1 — GST rate auto-fill check
 * Returns warning if user overrides product's default rate
 */
function checkGstRateOverride(
  item: LineItemInput,
  productDefaultRate: number | null,
  productDefaultName: string | null,
): string | null {
  if (productDefaultRate !== null && item.gst_rate !== productDefaultRate) {
    return `Default rate for "${productDefaultName || item.product_name}" is ${productDefaultRate}% — confirm change to ${item.gst_rate}%`;
  }
  return null;
}

/**
 * Rule 2 — ₹1,000 garment threshold
 * Auto-upgrades rate from 5% to 12% if price crosses ₹1,000
 */
function checkThreshold(
  item: LineItemInput,
): { rate: number; warning: string | null } {
  if (!item.is_price_sensitive) {
    return { rate: item.gst_rate, warning: null };
  }
  const resolved = resolveThresholdRate(
    item.rate_paise,
    true,
    item.threshold_paise || 100000,
    item.gst_rate,
  );
  if (resolved.rate !== item.gst_rate) {
    return {
      rate: resolved.rate,
      warning: `Rate changed to ${resolved.rate}% — item price exceeds ₹${(item.threshold_paise || 100000) / 100}`,
    };
  }
  return { rate: item.gst_rate, warning: resolved.warning };
}

/**
 * Rule 3 — Section 17(5) ITC block check
 * Returns true if this purchase item's ITC is blocked
 */
function checkSection175(
  item: LineItemInput,
  category: string | null,
): { blocked: boolean; reason: string | null } {
  const searchText = [
    item.product_name,
    category,
    item.hsn_code,
  ].filter(Boolean).join(' ').toLowerCase();

  for (const blocked of BLOCKED_CATEGORIES) {
    if (searchText.includes(blocked.toLowerCase())) {
      return { blocked: true, reason: `Section 17(5) — ${blocked}` };
    }
  }

  for (const blocked of BLOCKED_PRODUCT_NAMES) {
    if (item.product_name.toLowerCase().includes(blocked.toLowerCase())) {
      return { blocked: true, reason: `Section 17(5) — ${blocked}` };
    }
  }

  return { blocked: false, reason: null };
}

/**
 * Rule 4 — IGST vs CGST+SGST split based on GSTIN state code
 */
function determineInterState(
  businessGstin: string | null,
  partyGstin: string | null,
): boolean {
  if (!businessGstin || !partyGstin) return false;
  if (businessGstin.length < 2 || partyGstin.length < 2) return false;
  return businessGstin.substring(0, 2) !== partyGstin.substring(0, 2);
}

/**
 * Rule 5 — RCM detection
 */
function checkRCM(
  partyName: string | null,
  partyGstin: string | null,
): { applicable: boolean } {
  // No Indian GSTIN — likely foreign vendor, RCM applies
  if (!partyGstin || partyGstin.trim() === '') {
    return { applicable: true };
  }

  // Check vendor name against known foreign providers
  if (partyName) {
    const normalized = partyName.toLowerCase();
    for (const pattern of RCM_VENDOR_PATTERNS) {
      if (normalized.includes(pattern)) {
        return { applicable: true };
      }
    }
  }

  return { applicable: false };
}

/**
 * Rule 6 — Duplicate invoice detection
 * Returns the date of the previous entry if found
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingEntryDate: string | null;
  existingEntryId: string | null;
}

/**
 * Rule 8 — Time-barred ITC
 * Returns true if invoice date is past Nov 30 deadline
 */
function isTimeBarred(entryDateStr: string): { barred: boolean; reason: string | null } {
  const entryDate = new Date(entryDateStr);
  const now = new Date();

  // Determine FY of entry
  const entryMonth = entryDate.getMonth(); // 0-indexed
  const entryYear = entryDate.getFullYear();
  const entryFY = entryMonth >= 3 ? entryYear : entryYear - 1;

  // Current FY
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  const currentFY = nowMonth >= 3 ? nowYear : nowYear - 1;

  // If entry is from current FY — not time-barred
  if (entryFY === currentFY) {
    return { barred: false, reason: null };
  }

  // If entry is from previous FY, check against Nov 30 deadline
  const deadline = new Date(entryFY + 1, 10, 30); // Nov 30 of next FY
  if (now > deadline) {
    return {
      barred: true,
      reason: 'Invoice past Nov 30 deadline — ITC may be time-barred. Consult your CA before claiming.',
    };
  }

  return { barred: false, reason: null };
}

/**
 * Calculate GST breakdown for a line item
 * User enters GST-inclusive amount, we back-calculate taxable
 * Formula: taxable = amount × 100 ÷ (100 + gst_rate)
 *          gst = amount − taxable
 */
function calculateGSTForLine(
  item: LineItemInput,
  isInterState: boolean,
): {
  amount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_gst_paise: number;
  total_paise: number;
} {
  const amount_paise = Math.round(item.quantity * item.rate_paise);
  const effectiveRate = item.gst_rate;

  // Back-calculate taxable from GST-inclusive amount
  const taxable_paise = Math.round(amount_paise * 100 / (100 + effectiveRate));
  const total_gst_paise = amount_paise - taxable_paise;

  let cgst_paise = 0;
  let sgst_paise = 0;
  let igst_paise = 0;

  if (isInterState) {
    igst_paise = total_gst_paise;
  } else {
    cgst_paise = Math.floor(total_gst_paise / 2);
    sgst_paise = total_gst_paise - cgst_paise;
  }

  return {
    amount_paise,
    taxable_paise,
    cgst_paise,
    sgst_paise,
    igst_paise,
    total_gst_paise,
    total_paise: amount_paise,
  };
}

/**
 * Main entry validation — runs all 8 business rules
 */
export async function validateEntry(
  input: EntryValidationInput,
  options: {
    productRates?: Map<string, { id: string; name: string; defaultRate: number; category: string | null }>;
    existingInvoiceCheck?: DuplicateCheckResult;
    isUpdate?: boolean;
    entryId?: string;
  } = {},
): Promise<EntryValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isPurchase = input.entry_type === 'PURCHASE' || input.entry_type === 'PURCHASE_RETURN';

  // Rule 4 — determine inter-state
  const isInterState = determineInterState(input.business_gstin, input.party_gstin || null);

  // Rule 5 — RCM detection
  const rcm = isPurchase ? checkRCM(input.party_name || null, input.party_gstin || null) : { applicable: false };
  let rcmAmountPaise = 0;

  // Rule 6 — Duplicate invoice check
  if (options.existingInvoiceCheck?.isDuplicate && !options.isUpdate) {
    const dup = options.existingInvoiceCheck;
    warnings.push(
      `This invoice number ("${input.invoice_number}") was already entered on ${dup.existingEntryDate}. Are you sure this is a new entry?`,
    );
  }

  // Rule 7 — Period lock (handled in API route, not here)
  // Rule 7 is checked at API level by querying filing_periods table

  // Rule 8 — Time-barred ITC
  const timeBarred = isPurchase ? isTimeBarred(input.entry_date) : { barred: false, reason: null };
  if (timeBarred.barred && timeBarred.reason) {
    warnings.push(`⚠️ ${timeBarred.reason}`);
  }

  // Validate required fields
  if (!input.entry_type) errors.push('Entry type is required');
  if (!input.entry_date) errors.push('Entry date is required');
  if (!input.payment_mode) errors.push('Payment mode is required');
  if (!input.line_items || input.line_items.length === 0) {
    errors.push('At least one line item is required');
  }

  // Process each line item
  const validatedLineItems: ValidatedLineItem[] = [];
  const productRates = options.productRates || new Map();

  for (let i = 0; i < input.line_items.length; i++) {
    const item = input.line_items[i];
    const itemWarnings: string[] = [];

    if (!item.product_name) {
      errors.push(`Line item ${i + 1}: Product name is required`);
      continue;
    }
    if (!item.rate_paise || item.rate_paise <= 0) {
      errors.push(`Line item ${i + 1} (${item.product_name}): Rate is required`);
      continue;
    }
    if (item.gst_rate === undefined || item.gst_rate < 0) {
      errors.push(`Line item ${i + 1} (${item.product_name}): GST rate is invalid`);
      continue;
    }

    // Rule 1 — GST rate auto-fill override warning
    if (item.product_id) {
      const prodInfo = productRates.get(item.product_id);
      if (prodInfo) {
        const rateWarning = checkGstRateOverride(item, prodInfo.defaultRate, prodInfo.name);
        if (rateWarning) itemWarnings.push(rateWarning);
      }
    }

    // Rule 2 — ₹1,000 threshold
    let effectiveGstRate = item.gst_rate;
    if (item.is_price_sensitive) {
      const threshold = checkThreshold(item);
      effectiveGstRate = threshold.rate;
      if (threshold.warning) itemWarnings.push(threshold.warning);
    }

    // Calculate GST
    const gstCalc = calculateGSTForLine(
      { ...item, gst_rate: effectiveGstRate },
      isInterState,
    );

    // Determine ITC status for purchase entries
    let itcStatus: ValidatedLineItem['itc_status'] = 'UNKNOWN';
    let itcAmountPaise = 0;
    let blockReason: string | null = null;

    if (isPurchase) {
      // Default: ITC is eligible unless blocked
      itcStatus = 'ELIGIBLE';
      itcAmountPaise = gstCalc.total_gst_paise;

      // Rule 3 — Section 17(5) block
      const section175 = checkSection175(item, item.product_category || null);
      if (section175.blocked) {
        itcStatus = 'BLOCKED';
        itcAmountPaise = 0;
        blockReason = section175.reason;
        itemWarnings.push(`ITC blocked — ${section175.reason}`);
      }

      // Rule 5 — RCM
      if (rcm.applicable) {
        itcStatus = 'RCM';
        // For RCM: ITC is still recoverable (pay RCM, claim ITC same month)
        itcAmountPaise = gstCalc.total_gst_paise;
        rcmAmountPaise += gstCalc.total_gst_paise;
        itemWarnings.push('RCM applicable — pay RCM and claim ITC in same month');
      }

      // Rule 8 — Time-barred overrides ITC
      if (timeBarred.barred && itcStatus === 'ELIGIBLE') {
        itcStatus = 'TIME_BARRED';
        itcAmountPaise = 0;
        blockReason = timeBarred.reason;
      }
    }

    // Add threshold/time-barred warnings as entry-level warnings too
    warnings.push(...itemWarnings);

    validatedLineItems.push({
      ...item,
      gst_rate: effectiveGstRate,
      amount_paise: gstCalc.amount_paise,
      taxable_paise: gstCalc.taxable_paise,
      cgst_paise: gstCalc.cgst_paise,
      sgst_paise: gstCalc.sgst_paise,
      igst_paise: gstCalc.igst_paise,
      total_gst_paise: gstCalc.total_gst_paise,
      total_paise: gstCalc.total_paise,
      itc_status: itcStatus,
      itc_amount_paise: itcAmountPaise,
      block_reason: blockReason,
      warnings: itemWarnings,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...new Set(warnings)], // deduplicate
    validatedLineItems,
    isInterState,
    rcmApplicable: rcm.applicable,
    rcmAmountPaise,
  };
}
