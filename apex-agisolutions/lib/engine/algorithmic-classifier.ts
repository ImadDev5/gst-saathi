import { classifyITC, type ITCClassification } from "@/lib/engine/itc-engine";
import { detectRCM } from "@/lib/engine/rcm-detector";
import { reverseCalculateGST } from "@/lib/engine/gst-calculator";
import {
  loadRules,
  matchRules,
  getEmbeddedRules,
  type ClassificationRule,
} from "@/lib/engine/rule-engine";

export interface AlgoClassificationResult {
  id?: string;
  mapped_vendor_name: string | null;
  itc_status: string;
  itc_confidence: number;
  block_reason: string | null;
  rcm_type: string | null;
  action_required: string | null;
  gst_amount: number;
  category: string | null;
  matched_rules: string[];
  matched_sections: string[];
}

const TXN_TYPE_PATTERNS: Array<[string, string[]]> = [
  ["NEFT", ["NEFT"]],
  ["RTGS", ["RTGS"]],
  ["IMPS", ["IMPS"]],
  ["ECS_NACH", ["ECS", "NACH"]],
  ["EMI", ["EMI"]],
  ["TAX_PMT", ["GST PMT", "GST PAY", "TAX PAYMENT", "TDS PMT", "INCOME TAX", "ADVANCE TAX"]],
  ["SALARY", ["SALARY", "PAYROLL", "STAFF SAL", "LABOUR PAY", "SAL CR", "SAL-"]],
  ["INTEREST", ["INT CR", "INT PD", "INT DR", "INT ON", "INTEREST", "INT.CR"]],
  ["BANK_CHARGES", ["CHGS", "CHARGES", "SMS ALERT", "MIN BAL", "CHEQUE BOOK", "CASH HANDL", "ANNUAL FEE"]],
  ["UPI", ["UPI", "GPAY", "PHONEPE", "PAYTM", "BHIM", "GOOGLE PAY"]],
  ["POS", ["POS", "PURCHASE AT", "PURCHASE-", "PAY*"]],
  ["CHEQUE", ["CHQ", "CHEQUE", "CLG", "CLEARING"]],
  ["CASH", ["ATM", "CASH WDL", "CASH DEP", "CDM", "SELF WITHDRAWAL"]],
  ["SI", ["SI/", "STANDING INSTRUCTION"]],
  ["INSURANCE", ["INSURANCE", "LIC ", "PREMIUM", "POLICY"]],
];

function detectTransactionType(narration: string): string {
  const up = narration.toUpperCase().replace(/[^A-Z0-9 \/\-]/g, "");
  for (const [type, prefixes] of TXN_TYPE_PATTERNS) {
    for (const prefix of prefixes) {
      if (up.includes(prefix.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))) {
        return type;
      }
    }
  }
  return "UNKNOWN";
}

const KNOWN_MERCHANTS: Array<[string, string]> = [
  ["AMAZON", "Amazon"],
  ["FLIPKART", "Flipkart"],
  ["MYNTRA", "Myntra"],
  ["SWIGGY", "Swiggy"],
  ["ZOMATO", "Zomato"],
  ["UBER", "Uber"],
  ["OLA", "Ola"],
  ["NETFLIX", "Netflix"],
  ["HOTSTAR", "Hotstar"],
  ["SPOTIFY", "Spotify"],
  ["YOUTUBE.*PREMIUM", "YouTube"],
  ["GOOGLE", "Google"],
  ["MICROSOFT", "Microsoft"],
  ["AWS", "AWS"],
  ["DIGITALOCEAN", "DigitalOcean"],
  ["GODADDY", "GoDaddy"],
  ["MAKEMYTRIP", "MakeMyTrip"],
  ["GOIBIBO", "Goibibo"],
  ["IRCTC", "IRCTC"],
  ["PAYTM", "Paytm"],
  ["PHONEPE", "PhonePe"],
  ["MOBIKWIK", "MobiKwik"],
  ["LIC", "LIC"],
  ["HDFC", "HDFC"],
  ["ICICI", "ICICI"],
  ["SBI", "SBI"],
  ["AXIS", "Axis"],
  ["AIRTEL", "Airtel"],
  ["JIO", "Jio"],
  ["TATA", "Tata"],
  ["RELIANCE", "Reliance"],
  ["ZOHO", "Zoho"],
  ["FRESHWORKS", "Freshworks"],
  ["ADOBE", "Adobe"],
  ["ATLASSIAN", "Atlassian"],
  ["SALESFORCE", "Salesforce"],
  ["GITHUB", "GitHub"],
  ["SLACK", "Slack"],
  ["ZOOM", "Zoom"],
  ["NOTION", "Notion"],
  ["CANVA", "Canva"],
  ["FIGMA", "Figma"],
  ["HUBSPOT", "HubSpot"],
  ["DHL", "DHL"],
  ["FEDEX", "FedEx"],
  ["BLUE.?DART", "Blue Dart"],
  ["DTDC", "DTDC"],
  ["DELHIVERY", "Delhivery"],
];

function extractVendorName(narration: string): string | null {
  let clean = narration.toUpperCase().trim();

  // Strip transaction type prefixes
  const prefixes = ["NEFT", "RTGS", "IMPS", "UPI", "POS", "ECS", "NACH", "SI"];
  for (const prefix of prefixes) {
    const idx = clean.indexOf(prefix);
    if (idx >= 0 && idx <= 10) {
      clean = clean.substring(idx + prefix.length);
    }
  }

  // Remove leading delimiters
  clean = clean.replace(/^[\/\-\s:]+/, "");

  // Remove UTR-like numbers (12+ digits)
  clean = clean.replace(/\d{12,}/g, "");

  // Remove IFSC codes
  clean = clean.replace(/[A-Z]{4}0\d{6}/g, "");

  // Remove VPAs
  clean = clean.replace(/[\w.+\-]+@[\w]+/g, "");

  // Remove amounts
  clean = clean.replace(/(?:INR|RS\.?|₹)?\s*[\d,]+\.?\d*\s*(?:DR|CR)?/gi, "");

  // Try M/S pattern
  let m = clean.match(/M\/S\s+([A-Z][A-Z\s&.,()\-]{2,}?)(?:\s*(?:LTD|LLP|PVT|PRIVATE|LIMITED|CORP|INC|ENTERPRISES?|ASSOCIATES?|TRADERS?|TRADING|INDUSTRIES))?/i);
  if (m) return m[1].trim();

  // Try FRM/FROM/BY/TO pattern
  m = clean.match(/(?:FRM|FROM|BY|TO)\s+([A-Z][A-Z\s&.,()\-]{3,})/i);
  if (m && m[1].length > 3) return m[1].trim();

  // Try LTD/LLP/PVT/PRIVATE/LIMITED pattern
  m = clean.match(/([A-Z][A-Z\s&.,()\-]{3,}?)(?:\s*(?:LTD|LLP|PVT|PRIVATE|LIMITED|INDIA|CORP|INC))(?:\.|\s|$)/i);
  if (m) return m[1].trim();

  // Known merchants
  for (const [pattern, name] of KNOWN_MERCHANTS) {
    if (new RegExp(pattern, "i").test(clean)) {
      return name;
    }
  }

  return null;
}

function isPersonalExpense(narration: string, amount: number): boolean {
  const up = narration.toUpperCase();

  const personalIndicators = [
    /SWIGGY|ZOMATO|DOMINOS|MCDONALD|EAT.?FIT|FOOD.?ORDER/,
    /MYNTRA|AJIO|NYKAA|PERSONAL.*SHOPPING/,
    /PVR|INOX|CINE.?POLIS|BOOK.?MY.?SHOW|MOVIE.*TICKET/,
    /NETFLIX|HOTSTAR|SPOTIFY/,
    /SELF|PERSONAL.*USE|FAMILY|HOME.*USE/,
    /ATM.*WDL|CASH.*WITHDRAWAL/,
    /LIC.*INDIA|HDFC.*LIFE|SBI.*LIFE/,
    /LOAN.*REPAY|EMI.*PERSONAL/,
    /CASH.*WDL/,
  ];

  let personalScore = 0;
  for (const indicator of personalIndicators) {
    if (indicator.test(up)) personalScore += 2;
  }

  // Small amounts are more likely personal
  if (amount < 100000) personalScore += 1; // < ₹1000
  if (amount > 400000) personalScore -= 1; // > ₹4000 — likely business

  // Weekend timing (we'd need date, not available here)
  // Business keywords reduce personal score
  if (/INVOICE|TAXABLE|GSTIN|SUPPLY|BULK|WHOLESALE|COMMERCIAL|CORPORATE|ENTERPRISE|PVT|LTD|LLP/.test(up)) {
    personalScore -= 2;
  }

  return personalScore >= 3;
}

let rulesPromise: Promise<ClassificationRule[]> | null = null;

function getRulesSync(): ClassificationRule[] {
  if (!rulesPromise) {
    rulesPromise = loadRules();
  }
  // For synchronous usage, use embedded rules initially
  return getEmbeddedRules();
}

export class AlgorithmicClassifier {
  private rulesLoaded = false;

  async init(): Promise<void> {
    if (!this.rulesLoaded) {
      await loadRules();
      this.rulesLoaded = true;
    }
  }

  classify(
    narration: string,
    amountPaise: number,
  ): AlgoClassificationResult {
    const startedAt = Date.now();
    const rules = getRulesSync();
    const matchedRules = matchRules(narration, rules);
    const matchedRuleIds = matchedRules.map((r) =>
      r.id || r.pattern.substring(0, 30),
    );
    const matchedSections = [
      ...new Set(
        matchedRules
          .map((r) => r.section)
          .filter(Boolean) as string[],
      ),
    ];

    const txnType = detectTransactionType(narration);
    const vendor = extractVendorName(narration);
    const amountRupee = amountPaise / 100;
    const personal = isPersonalExpense(narration, amountPaise);

    // Merge all matching rules
    const bestRule = matchedRules[0] || null;
    const bestCategory = bestRule?.category || null;
    const bestItcStatus = bestRule?.itc_status || "UNKNOWN";
    const bestRate = bestRule?.gst_rate || 18;

    let itcStatus = bestItcStatus;
    let blockReason = bestRule?.block_reason || null;
    let rcmType = bestRule?.rcm_type || null;
    let confidence = 0.5;

    // If no rules matched, fall back to ITC Engine + RCM detector
    if (matchedRules.length === 0) {
      const narrationClean = narration.toUpperCase();
      const rcmResult = detectRCM(narrationClean, amountPaise, false, false, null);

      if (rcmResult.rcmApplicable) {
        itcStatus = "RCM";
        rcmType = rcmResult.rcmType;
        blockReason = null;
        confidence = 0.6;
      } else {
        const itcResult = classifyITC({
          category: null,
          invoiceType: "UNKNOWN",
          isPersonal: personal,
          vendorGstRegistered: null,
          gstr2bStatus: "UNKNOWN",
          invoiceDate: null,
          rcmApplicable: false,
        });

        itcStatus = itcResult.itcStatus;
        blockReason = itcResult.blockReason;
        confidence = itcResult.confidence - 0.1;
      }
    } else {
      // Determine confidence based on match quality
      const rulePriority = bestRule?.priority || 0;

      if (rulePriority >= 95) {
        confidence = 0.9;
      } else if (rulePriority >= 85) {
        confidence = 0.85;
      } else if (rulePriority >= 75) {
        confidence = 0.8;
      } else if (rulePriority >= 65) {
        confidence = 0.7;
      } else {
        confidence = 0.6;
      }

      // Multiple agreeing rules boost confidence
      const agreeingRules = matchedRules.filter((r) => r.itc_status === itcStatus);
      if (agreeingRules.length >= 2) {
        confidence = Math.min(0.95, confidence + 0.05);
      }

      // No block reason? Check if ITC Engine adds more detail
      if (itcStatus !== "RCM" && itcStatus !== "UNKNOWN") {
        const itcResult = classifyITC({
          category: bestCategory,
          invoiceType: "UNKNOWN",
          isPersonal: personal,
          vendorGstRegistered: null,
          gstr2bStatus: "UNKNOWN",
          invoiceDate: null,
          rcmApplicable: itcStatus === "RCM",
        });

        if (itcResult.blockReason && !blockReason) {
          blockReason = itcResult.blockReason;
        }

        if (itcResult.itcStatus === "BLOCKED" && itcStatus === "ELIGIBLE") {
          itcStatus = "BLOCKED";
          confidence = Math.max(confidence, 0.85);
        }
      }
    }

    // Calculate GST amount
    let gstAmount = 0;
    if (itcStatus === "RCM" || itcStatus === "ELIGIBLE" || itcStatus === "BLOCKED") {
      gstAmount = reverseCalculateGST(amountPaise, bestRate);
    }

    // Determine action required
    let actionRequired: string | null = null;
    switch (itcStatus) {
      case "ELIGIBLE":
        actionRequired = "Verify in GSTR-2B portal";
        break;
      case "RCM":
        actionRequired = "Pay RCM tax; claim ITC in same month";
        break;
      case "BLOCKED":
        actionRequired = "Do not claim — inform CA";
        break;
      case "AT_RISK":
        actionRequired = "Follow up with vendor to file GSTR-1";
        break;
      case "NEEDS_INVOICE":
        actionRequired = matchedRules.length > 0
          ? "Request B2B invoice from vendor"
          : "Verify if vendor is GST-registered";
        break;
      case "TIME_BARRED":
        actionRequired = "Flag for CA records — ITC cannot be claimed";
        break;
      case "PERSONAL":
        actionRequired = null;
        break;
      default:
        actionRequired = "Review classification manually";
        break;
    }

    // Clean up status for downstream compatibility
    const validStatuses = [
      "ELIGIBLE", "BLOCKED", "RCM", "UNKNOWN", "CONDITIONAL",
      "AT_RISK", "NEEDS_INVOICE", "TIME_BARRED", "PERSONAL",
    ];
    const finalStatus = validStatuses.includes(itcStatus) ? itcStatus : "UNKNOWN";

    // "UNKNOWN" from non-ITC items stays UNKNOWN (not a purchase)
    if (finalStatus === "UNKNOWN" && bestItcStatus === "UNKNOWN") {
      actionRequired = "Review classification manually";
    }

    const elapsed = Date.now() - startedAt;

    if (process.env.DEBUG_ALGO_CLASSIFIER === "1") {
      console.info(
        `[algo] narration="${narration.substring(0, 80)}" ` +
        `category=${bestCategory || "none"} txnType=${txnType} ` +
        `vendor="${vendor || "none"}" status=${finalStatus} ` +
        `confidence=${confidence.toFixed(2)} rules=${matchedRuleIds.length} ` +
        `timeMs=${elapsed}`,
      );
    }

    return {
      mapped_vendor_name: vendor,
      itc_status: finalStatus,
      itc_confidence: Math.round(confidence * 100) / 100,
      block_reason: blockReason,
      rcm_type: rcmType,
      action_required: actionRequired,
      gst_amount: gstAmount,
      category: bestCategory,
      matched_rules: matchedRuleIds,
      matched_sections: matchedSections,
    };
  }
}

export const defaultAlgoClassifier = new AlgorithmicClassifier();
