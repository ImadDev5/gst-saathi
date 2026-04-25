/**
 * GST Calculator — Handles CGST/SGST/IGST split and ₹1,000 threshold logic
 * Used by Module B retail entries
 */

export interface GSTBreakdown {
  taxablePaise: number;
  gstRate: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
  thresholdWarning: string | null;
}

/**
 * Determine GST rate for price-sensitive products (garments/footwear)
 * Items ≤ ₹1,000 → 5%, items > ₹1,000 → 12%
 */
export function resolveThresholdRate(
  ratePaise: number,
  isPriceSensitive: boolean,
  thresholdPaise: number = 100000, // ₹1,000 default
  defaultRate: number = 5
): { rate: number; warning: string | null } {
  if (!isPriceSensitive) {
    return { rate: defaultRate, warning: null };
  }

  const isAbove = ratePaise > thresholdPaise;
  const rate = isAbove ? 12 : 5;

  // Warn if within ₹100 of threshold (₹900–₹1,100)
  const nearThreshold = Math.abs(ratePaise - thresholdPaise) <= 10000; // ₹100 in paise
  const warning = nearThreshold
    ? `Price is close to ₹${thresholdPaise / 100} threshold — GST rate changes from 5% to 12%. Current rate: ${rate}%`
    : null;

  return { rate, warning };
}

/**
 * Calculate GST breakdown for a retail entry
 * @param quantity - item count
 * @param ratePaise - per unit rate in paise (excl. GST)
 * @param gstRate - GST percentage (0, 5, 12, 18, 28)
 * @param isInterState - true if buyer/seller in different states → IGST
 */
export function calculateGST(
  quantity: number,
  ratePaise: number,
  gstRate: number,
  isInterState: boolean = false,
  isPriceSensitive: boolean = false,
  thresholdPaise: number = 100000
): GSTBreakdown {
  // Resolve threshold-sensitive rate
  let effectiveRate = gstRate;
  let thresholdWarning: string | null = null;

  if (isPriceSensitive) {
    const resolved = resolveThresholdRate(ratePaise, true, thresholdPaise, gstRate);
    effectiveRate = resolved.rate;
    thresholdWarning = resolved.warning;
  }

  const taxablePaise = Math.round(quantity * ratePaise);
  const totalGstPaise = Math.round(taxablePaise * effectiveRate / 100);

  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if (isInterState) {
    igstPaise = totalGstPaise;
  } else {
    // Intra-state: split equally between CGST and SGST
    cgstPaise = Math.floor(totalGstPaise / 2);
    sgstPaise = totalGstPaise - cgstPaise; // Handle odd paise
  }

  return {
    taxablePaise,
    gstRate: effectiveRate,
    cgstPaise,
    sgstPaise,
    igstPaise,
    totalPaise: taxablePaise + totalGstPaise,
    thresholdWarning,
  };
}

/**
 * Reverse-calculate GST from a GST-inclusive amount
 * Used in Module A for bank statement transactions
 * total = base + (base × rate/100) → base = total × 100 / (100 + rate)
 */
export function reverseCalculateGST(totalPaise: number, gstRate: number): number {
  if (gstRate <= 0) return 0;
  return Math.round(totalPaise * gstRate / (100 + gstRate));
}
