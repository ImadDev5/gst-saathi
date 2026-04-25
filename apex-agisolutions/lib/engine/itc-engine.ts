/**
 * ITC Eligibility Engine — Section 16 & 17(5) Decision Tree
 * Applies the 7-step ITC eligibility check per CGST Act 2017
 */

// Section 17(5) blocked categories
const BLOCKED_CATEGORIES = [
  'Food Delivery', 'Food & Beverages', 'Restaurant',
  'Outdoor Catering', 'Event Catering',
  'Personal Motor Vehicle', 'Car Fuel', 'Car Servicing',
  'Beauty', 'Salon', 'Gym', 'Health Club',
  'Club Membership', 'Golf Club', 'Gymkhana',
  'Life Insurance', 'Health Insurance',
  'Works Contract', 'Interior Fit-out',
  'Construction', 'Building Purchase',
  'Travel Benefits', 'Vacation', 'Holiday Package',
] as const;

export interface ITCClassification {
  itcStatus: 'ELIGIBLE' | 'BLOCKED' | 'AT_RISK' | 'RCM' | 'NEEDS_INVOICE' | 'TIME_BARRED' | 'PERSONAL' | 'UNKNOWN';
  blockReason: string | null;
  actionRequired: string | null;
  confidence: number;
}

export interface TransactionInput {
  category: string | null;
  invoiceType: 'B2B' | 'B2C' | 'UNKNOWN';
  isPersonal: boolean;
  vendorGstRegistered: boolean | null; // null = unknown
  gstr2bStatus: 'CONFIRMED' | 'NOT_FOUND' | 'PENDING' | 'UNKNOWN';
  invoiceDate: string | null; // ISO date
  rcmApplicable: boolean;
}

/**
 * Check if invoice is time-barred for ITC claim
 * ITC must be claimed by Nov 30 of the next financial year
 */
function isTimeBarred(invoiceDateStr: string | null): boolean {
  if (!invoiceDateStr) return false;

  const invoiceDate = new Date(invoiceDateStr);
  const now = new Date();

  // Determine FY of invoice: FY runs Apr 1 → Mar 31
  const invoiceMonth = invoiceDate.getMonth(); // 0-indexed
  const invoiceYear = invoiceDate.getFullYear();
  const invoiceFY = invoiceMonth >= 3 ? invoiceYear : invoiceYear - 1; // Apr(3)+ = same year, Jan-Mar = prev year

  // Deadline is Nov 30 of the NEXT FY
  const deadlineYear = invoiceFY + 1;
  const deadline = new Date(deadlineYear, 10, 30); // Nov 30 (month 10)

  return now > deadline;
}

/**
 * Check if category is blocked under Section 17(5)
 */
function isBlocked175(category: string | null): string | null {
  if (!category) return null;

  const normalized = category.toUpperCase();

  for (const blocked of BLOCKED_CATEGORIES) {
    if (normalized.includes(blocked.toUpperCase())) {
      return `Section 17(5) — ${blocked}`;
    }
  }

  return null;
}

/**
 * Main ITC classification engine
 * Implements the 7-step decision tree from PRD Section 6C
 */
export function classifyITC(input: TransactionInput): ITCClassification {
  // Step 1: Is the expense personal?
  if (input.isPersonal) {
    return {
      itcStatus: 'PERSONAL',
      blockReason: 'Personal expense — not for business use',
      actionRequired: null,
      confidence: 0.95,
    };
  }

  // Step 2: Is the vendor GST-registered?
  if (input.vendorGstRegistered === false) {
    return {
      itcStatus: 'NEEDS_INVOICE',
      blockReason: 'Vendor not GST-registered — ITC not available',
      actionRequired: 'Verify if vendor is registered on GST portal',
      confidence: 0.8,
    };
  }

  // Step 3: Section 17(5) blocked credit check
  const blockReason = isBlocked175(input.category);
  if (blockReason) {
    return {
      itcStatus: 'BLOCKED',
      blockReason,
      actionRequired: 'Do not claim — inform CA',
      confidence: 0.95,
    };
  }

  // Step 4: RCM applicable?
  if (input.rcmApplicable) {
    return {
      itcStatus: 'RCM',
      blockReason: null,
      actionRequired: 'Pay RCM tax; claim ITC in same month',
      confidence: 0.9,
    };
  }

  // Step 5: Is this a B2B invoice?
  if (input.invoiceType === 'B2C') {
    return {
      itcStatus: 'NEEDS_INVOICE',
      blockReason: 'B2C invoice — GSTIN not on invoice',
      actionRequired: 'Request B2B invoice from vendor with your GSTIN',
      confidence: 0.9,
    };
  }

  // Step 6: Time-barred check
  if (isTimeBarred(input.invoiceDate)) {
    return {
      itcStatus: 'TIME_BARRED',
      blockReason: 'Invoice past Nov 30 deadline — ITC permanently lost',
      actionRequired: 'Flag for CA records — ITC cannot be claimed',
      confidence: 0.95,
    };
  }

  // Step 7: GSTR-2B verification
  if (input.gstr2bStatus === 'CONFIRMED') {
    return {
      itcStatus: 'ELIGIBLE',
      blockReason: null,
      actionRequired: null,
      confidence: 0.95,
    };
  }

  if (input.gstr2bStatus === 'NOT_FOUND') {
    return {
      itcStatus: 'AT_RISK',
      blockReason: 'Not reflected in GSTR-2B — vendor may not have filed GSTR-1',
      actionRequired: 'Follow up with vendor to file GSTR-1',
      confidence: 0.7,
    };
  }

  // Default: eligible but verify
  return {
    itcStatus: 'ELIGIBLE',
    blockReason: null,
    actionRequired: 'Verify in GSTR-2B portal',
    confidence: 0.75,
  };
}
