/**
 * Tax Terms Dictionary — maps technical GST jargon to plain English.
 * Every user-facing label should pass through this layer.
 *
 * Usage:
 *   import { t } from "@/lib/tax-terms";
 *   t("ITC") → "Tax you can claim back"
 *   t("Eligible") → "Can claim"
 */

export const PLAIN_LABELS: Record<string, string> = {
  // ── Core concepts ──
  ITC: "Tax you can claim back",
  "Input Tax Credit": "Tax you can claim back",
  "Eligible ITC": "Tax saved",
  ITC_Earned: "Tax saved on purchases",
  "ITC Earned": "Tax saved on purchases",
  "Blocked ITC": "Can't claim",

  // ── Tax components ──
  CGST: "Central tax",
  SGST: "State tax",
  IGST: "Tax (inter-state)",
  "IGST Amount": "Tax (inter-state)",
  "CGST Amount": "Central tax",
  "SGST Amount": "State tax",

  // ── Returns / Forms ──
  "GSTR-1": "Sales report",
  "GSTR-3B": "Monthly tax payment",
  "GSTR-2A": "Purchase report",

  // ── RCM ──
  RCM: "Tax you must pay (RCM)",
  "RCM Payable": "Tax you must pay",
  "Reverse Charge": "Tax you must pay (buyer)",

  // ── Codes ──
  "HSN Code": "Product code",
  "HSN": "Product code",
  "SAC Code": "Service code",
  "SAC": "Service code",
  GSTIN: "GST number",

  // ── Entity types ──
  B2B: "Registered business",
  B2C: "Regular customer",

  // ── Supplies ──
  "Outward supplies": "Your sales",
  "Outward taxable supplies": "Taxable sales",
  "Inward supplies": "Your purchases",
  "Nil rated / Exempted": "Tax-free sales",

  // ── ITC categories ──
  "ITC availed": "Tax claimed back",
  "ITC reversed": "Tax claim reversed",
  "ITC blocked (Section 17(5))": "Tax blocked by rules",

  // ── Other ──
  "Taxable amount": "Sale value (before tax)",
  "Section 17(5)": "Tax rule — not claimable",
  "Filing period": "Tax month",
  "Period locked": "Month filed",
};

/** ITC status badge labels — simplified versions */
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ELIGIBLE: { label: "Can claim", color: "green" },
  BLOCKED: { label: "Can't claim", color: "red" },
  RCM: { label: "You must pay", color: "amber" },
  CONDITIONAL: { label: "May claim", color: "amber" },
  AT_RISK: { label: "At risk", color: "amber" },
  NEEDS_INVOICE: { label: "Needs bill", color: "amber" },
  TIME_BARRED: { label: "Too late", color: "red" },
  PERSONAL: { label: "Personal", color: "grey" },
  UNKNOWN: { label: "Unclear", color: "grey" },
};

/** ITC status explanations — what each status means in plain English */
export const STATUS_EXPLANATIONS: Record<string, string> = {
  ELIGIBLE: "You can claim this tax back. Just make sure you have a proper invoice with your GST number.",
  BLOCKED: "Tax rules prevent claiming this back. This expense type is not allowed for tax credit.",
  RCM: "You must pay GST on this yourself, then claim it back in the same month.",
  CONDITIONAL: "You might be able to claim this back if certain conditions are met.",
  AT_RISK: "This may not match what the government portal shows. Verify before claiming.",
  NEEDS_INVOICE: "You need a proper tax invoice with your GST number before you can claim this.",
  TIME_BARRED: "The deadline to claim this has passed. It's too late.",
  PERSONAL: "This looks like a personal expense, not a business one.",
  UNKNOWN: "We're not sure about this one. Please review and mark it correctly.",
};

/** Action hints — what the user should do next for each status */
export const STATUS_ACTIONS: Record<string, string> = {
  ELIGIBLE: "Get a tax invoice with your GST number from this vendor.",
  BLOCKED: "No action needed — this expense can't be claimed.",
  RCM: "Pay GST yourself and file it in your monthly return.",
  CONDITIONAL: "Check with your CA if this can be claimed.",
  AT_RISK: "Double-check against your GST portal (GSTR-2A).",
  NEEDS_INVOICE: "Ask the vendor for a proper tax invoice.",
  TIME_BARRED: "No action possible — deadline has passed.",
  PERSONAL: "Mark as personal if this isn't a business expense.",
  UNKNOWN: "Help us classify this correctly by overriding the status.",
};

/**
 * Main translation function.
 * Returns the simplified label if one exists, otherwise the original term.
 */
export function t(term: string): string {
  return PLAIN_LABELS[term] || term;
}

/**
 * Get the simplified status label for an ITC status code.
 */
export function statusLabel(status: string): string {
  return STATUS_LABELS[status]?.label || status;
}

/**
 * Get the visual color for an ITC status code.
 */
export function statusColor(status: string): "green" | "red" | "amber" | "grey" {
  return (STATUS_LABELS[status]?.color as "green" | "red" | "amber" | "grey") || "grey";
}
