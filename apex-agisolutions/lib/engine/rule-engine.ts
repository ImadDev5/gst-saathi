export interface ClassificationRule {
  id?: string;
  pattern: string;
  category: string;
  itc_status: string;
  gst_rate: number;
  block_reason?: string | null;
  section?: string | null;
  rcm_type?: string | null;
  priority: number;
}

const EMBEDDED_RULES: ClassificationRule[] = [
  // Section 17(5)(b)(i) — Food & Beverages, Outdoor Catering, Beauty, Health, Cosmetic Surgery
  { pattern: "SWIGGY|ZOMATO|DOMINOS|MCDONALD|FRESH.?MENU|EAT.?FIT|FOODPANDA|UBER.?EATS", category: "Food & Beverages", itc_status: "BLOCKED", gst_rate: 5, block_reason: "Food delivery — blocked under Section 17(5)(b)(i)", section: "17(5)(b)(i)", priority: 95 },
  { pattern: "RESTAURANT|DINER|CAFE|BAKERY|SWEETS|DHABA|EATERY|CATERING|FOOD.?COURT", category: "Food & Beverages", itc_status: "BLOCKED", gst_rate: 5, block_reason: "Restaurant/food services — blocked under Section 17(5)(b)(i)", section: "17(5)(b)(i)", priority: 90 },
  { pattern: "LAKME|VLCC|SALON|SPA|BEAUTY|COSMETIC|HAIR.?CUT|FACIAL|WAXING|MANICURE|PEDICURE", category: "Beauty/Health Services", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Beauty/health services — blocked under Section 17(5)(b)(i)", section: "17(5)(b)(i)", priority: 90 },
  { pattern: "HOSPITAL|CLINIC|MEDICAL|DOCTOR|PHYSICIAN|SURGERY|PHARMACY|CHEMIST|MEDICINE", category: "Health Services", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Health services — blocked under Section 17(5)(b)(i)", section: "17(5)(b)(i)", priority: 80 },

  // Section 17(5)(b)(ii) — Club/Gym/Health Centre Membership
  { pattern: "GYM|FITNESS|HEALTH.?CLUB|CULT.?FIT|GOLD.?GYM|ANYTIME.?FITNESS|CROSS.?FIT", category: "Club/Gym Membership", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Gym/fitness membership — blocked under Section 17(5)(b)(ii)", section: "17(5)(b)(ii)", priority: 95 },
  { pattern: "GOLF.?CLUB|CLUB.?MEMBERSHIP|COUNTRY.?CLUB|SPORTS.?CLUB|GYMKHANA", category: "Club Membership", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Club membership — blocked under Section 17(5)(b)(ii)", section: "17(5)(b)(ii)", priority: 95 },

  // Section 17(5)(b)(iii) — Life Insurance, Health Insurance
  { pattern: "LIC.?OF.?INDIA|HDFC.?LIFE|ICICI.?PRU|SBI.?LIFE|MAX.?LIFE|BAJAJ.*LIFE|TATA.?AIA.?LIFE|PNB.?METLIFE|BHARTI.?AXA.?LIFE|KOTAK.?LIFE|ADITYA.?BIRLA.*LIFE|EXIDE.?LIFE|INDIA.?FIRST.?LIFE|AGEAS.?LIFE|FUTURE.*LIFE|AEGON.?LIFE", category: "Life Insurance", itc_status: "BLOCKED", gst_rate: 0, block_reason: "Life insurance — blocked under Section 17(5)(b)(iii)", section: "17(5)(b)(iii)", priority: 95 },
  { pattern: "STAR.?HEALTH|APOLLO.?MUNICH|CARE.?HEALTH|NIVA.?BUPA|ICICI.*HEALTH|MAX.?BUPA|RELIANCE.*HEALTH|MANIPAL.?CIGNA|HDFC.?ERGO.*HEALTH|BAJAJ.*HEALTH|ORIENTAL.?HEALTH|NEW.?INDIA.*HEALTH|UNITED.*INDIA.*HEALTH", category: "Health Insurance", itc_status: "BLOCKED", gst_rate: 0, block_reason: "Health insurance — blocked under Section 17(5)(b)(iii)", section: "17(5)(b)(iii)", priority: 95 },
  { pattern: "LIFE.?INSURANCE|HEALTH.?INSURANCE|MEDICLAIM|PERSONAL.?ACCIDENT.*INSURANCE", category: "Insurance", itc_status: "BLOCKED", gst_rate: 0, block_reason: "Insurance — blocked under Section 17(5)(b)(iii)", section: "17(5)(b)(iii)", priority: 85 },

  // Section 17(5)(b)(iv) — Travel Benefits (LTC/LTA)
  { pattern: "LTC|LTA|LEAVE.?TRAVEL|HOLIDAY.?PACKAGE|VACATION|TOUR.?PACKAGE", category: "Travel Benefits", itc_status: "BLOCKED", gst_rate: 5, block_reason: "Travel benefits — blocked under Section 17(5)(b)(iv)", section: "17(5)(b)(iv)", priority: 90 },

  // Section 17(5)(a) — Motor Vehicles ≤13 seater
  { pattern: "CAR.?PURCHASE|MOTOR.?CAR|MOTOR.?VEHICLE|PASSENGER.?VEHICLE|SUV.?PURCHASE|SEDAN.?PURCHASE", category: "Motor Vehicle", itc_status: "BLOCKED", gst_rate: 28, block_reason: "Motor vehicle (≤13 persons) — blocked under Section 17(5)(a)", section: "17(5)(a)", priority: 90 },

  // Section 17(5)(c)/(d) — Construction
  { pattern: "CEMENT|CONCRETE|BRICK|STEEL.*BAR|TMT.?BAR|SAND|AGGREGATE|BUILDING.?MATERIAL|CONSTRUCTION|CIVIL.?WORK|MASONRY|PLUMBING|ELECTRICAL.*WORK|PAINTING|CARPENTRY|INTERIOR", category: "Construction Materials", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Construction of immovable property — blocked under Section 17(5)(c)/(d)", section: "17(5)(c)/(d)", priority: 75 },

  // RCM — OIDAR Services (foreign digital services)
  { pattern: "GOOGLE.?ADS|FACEBOOK.?ADS|META.?ADS|LINKEDIN.?ADS|TWITTER.?ADS|INSTAGRAM.?ADS|SNAPCHAT.?ADS|TIKTOK.?ADS|PINTEREST.?ADS", category: "OIDAR Advertising", itc_status: "RCM", gst_rate: 18, rcm_type: "OIDAR", block_reason: null, section: "IGST S.14", priority: 98 },
  { pattern: "AWS|AMAZON.?WEB.?SERVICES|AZURE|GOOGLE.?CLOUD|GCP|HEROKU|VERCEL|NETLIFY|DIGITALOCEAN|LINODE|CLOUDFLARE", category: "OIDAR Cloud Services", itc_status: "RCM", gst_rate: 18, rcm_type: "OIDAR", block_reason: null, section: "IGST S.14", priority: 98 },
  { pattern: "SLACK|ZOOM|MICROSOFT.?365|NOTION|FIGMA|ADOBE|CANVA|SALESFORCE|HUBSPOT|ATLASSIAN|GITHUB|GITLAB|SENTRY|DATADOG|STRIPE|TWILIO|SENDGRID|MAILCHIMP", category: "OIDAR SaaS", itc_status: "RCM", gst_rate: 18, rcm_type: "OIDAR", block_reason: null, section: "IGST S.14", priority: 98 },
  { pattern: "DOMAIN.?REGISTRATION|WEB.?HOSTING|GODADDY|NAME.?COM|HOSTINGER|BLUEHOST|SITEGROUND|WP.?ENGINE", category: "OIDAR Hosting", itc_status: "RCM", gst_rate: 18, rcm_type: "OIDAR", block_reason: null, section: "IGST S.14", priority: 98 },
  { pattern: "PAYPAL|STRIPE.*PAYMENT|INTERNATIONAL.*TRANSFER|FOREIGN.*PAY|WISE.*TRANSFER", category: "Foreign Payment", itc_status: "RCM", gst_rate: 18, rcm_type: "IMPORT", block_reason: null, section: "IGST S.14", priority: 80 },

  // RCM — Goods Transport Agency
  { pattern: "TRANSPORT|TRUCKING|LOGISTICS|FREIGHT|CONSIGNMENT|GTA|GOODS.?TRANSPORT|DELHIVERY|BLUE.?DART|DTDC|FEDEX|DHL|FIRST.?FLIGHT|PROFESSIONAL.?COURIER|SAFEXPRESS", category: "Goods Transport Agency", itc_status: "RCM", gst_rate: 5, rcm_type: "GTA", block_reason: null, section: "S.9(3)", priority: 85 },

  // RCM — Legal Services
  { pattern: "ADVOCATE|LEGAL.?SERVICE|LAW.?FIRM|ATTORNEY|ARBITRAL|NOTARY|AFFIDAVIT|COURT.?FEE", category: "Legal Services", itc_status: "RCM", gst_rate: 18, rcm_type: "LEGAL", block_reason: null, section: "S.9(3)", priority: 90 },

  // RCM — Sponsorship
  { pattern: "SPONSORSHIP|SPONSOR.?FEE|EVENT.?SPONSOR|BRAND.?SPONSOR", category: "Sponsorship", itc_status: "RCM", gst_rate: 18, rcm_type: "SPONSORSHIP", block_reason: null, section: "S.9(3)", priority: 90 },

  // RCM — Rent from unregistered/commercial property
  { pattern: "RENT|LEASE.*PAYMENT|PROPERTY.?RENT|OFFICE.?RENT|WAREHOUSE.?RENT|GODOWN.?RENT", category: "Rent/Lease", itc_status: "ELIGIBLE", gst_rate: 18, block_reason: null, section: null, priority: 70 },

  // RCM — Security Services
  { pattern: "SECURITY.*SERVICE|SECURITY.*GUARD|MANDOUB|WATCHMAN.*SERVICE|GUARD.*SERVICE", category: "Security Services", itc_status: "ELIGIBLE", gst_rate: 18, block_reason: null, section: null, priority: 80 },

  // Business Expenses — ITC Eligible
  { pattern: "STATIONERY|PRINTER|CARTRIDGE|TONER|PEN.*DRIVE|OFFICE.?SUPPL|PAPER.*A4|NOTE.?BOOK|DIARY|REGISTER|CALENDAR|ENVELOPE", category: "Office Supplies", itc_status: "ELIGIBLE", gst_rate: 12, priority: 70 },
  { pattern: "TELEPHONE|MOBILE.*BILL|BROADBAND|INTERNET.*BILL|FIBER.*BILL|AIRTEL|JIO.*POST|VODAFONE|BSNL|MTNL", category: "Telecom", itc_status: "ELIGIBLE", gst_rate: 18, priority: 75 },
  { pattern: "ELECTRICITY|POWER.*BILL|BSES|TATA.?POWER|BEST.*UNDERTAKING|NESCO|WBSEDCL|MSEDCL|BESCOM|PSPCL", category: "Utilities - Electricity", itc_status: "ELIGIBLE", gst_rate: 0, priority: 75 },
  { pattern: "WATER.*BILL|MUNICIPAL.*CORP|WATER.*SUPPLY|WATER.*TAX", category: "Utilities - Water", itc_status: "ELIGIBLE", gst_rate: 0, priority: 75 },
  { pattern: "ADVERTISEMENT|ADVERTISING|MARKETING.*AGENCY|DIGITAL.*MARKET|PRINT.*MEDIA|HOARDING|PAMPHLET|BROCHURE|BILLBOARD|PROMOTION", category: "Advertising/Marketing", itc_status: "ELIGIBLE", gst_rate: 18, priority: 80 },
  { pattern: "CONSULT|CONSULTANCY|PROFESSIONAL.*FEE|TAX.*CONSULT|AUDIT.*FEE|ACCOUNTING|BOOK.?KEEPING|SECRETARIAL|COMPLIANCE", category: "Professional Services", itc_status: "ELIGIBLE", gst_rate: 18, priority: 80 },
  { pattern: "SOFTWARE|SAAS|LICENSE|SUBSCRIPTION|RENEWAL|ANTI.?VIRUS|FIREWALL|VPN|CLOUD", category: "Software/IT", itc_status: "ELIGIBLE", gst_rate: 18, priority: 80 },
  { pattern: "REPAIR|MAINTENANCE|SERVICING|AMC|ANNUAL.?MAINT|BREAKDOWN|OVERHAUL", category: "Repair & Maintenance", itc_status: "ELIGIBLE", gst_rate: 18, priority: 75 },
  { pattern: "COURIER|POSTAGE|SHIPMENT|SPEED.?POST|REGISTERED.?POST", category: "Courier/Postal", itc_status: "ELIGIBLE", gst_rate: 18, priority: 75 },
  { pattern: "RAW.?MATERIAL|STOCK|INVENTORY|GOODS|SUPPLY|PURCHASE|BULK.?ORDER|WHOLESALE", category: "Goods/Materials", itc_status: "ELIGIBLE", gst_rate: 18, priority: 65 },
  { pattern: "MACHINERY|EQUIPMENT|PLANT.*MACHINE|CAPITAL.?GOODS|FIXTURE|FURNITURE|COMPUTER|LAPTOP|SERVER", category: "Capital Goods", itc_status: "ELIGIBLE", gst_rate: 18, priority: 75 },
  { pattern: "HOTEL|ACCOMMODATION|LODGING|GUEST.?HOUSE|AIRBNB|OYO|MAKE.?MY.?TRIP|GOIBIBO|YATRA|EASE.?MY.?TRIP", category: "Travel - Hotel", itc_status: "ELIGIBLE", gst_rate: 18, priority: 70 },
  { pattern: "FLIGHT|AIRLINE|INDIGO|AIR.?INDIA|SPICE.?JET|VISTARA|AKASA.?AIR|AIR.?ASIA|GO.?FIRST", category: "Travel - Air", itc_status: "ELIGIBLE", gst_rate: 5, priority: 70 },
  { pattern: "TRAIN|RAILWAY|IRCTC|TATKAL", category: "Travel - Rail", itc_status: "ELIGIBLE", gst_rate: 5, priority: 70 },
  { pattern: "OLA|UBER|CAB|TAXI|RENT.?A.?CAR|ZOOM.?CAR|DRIVE.?ZY|REVV", category: "Travel - Cab", itc_status: "ELIGIBLE", gst_rate: 5, priority: 70 },
  { pattern: "FUEL|PETROL|DIESEL|CNG|LPG|GAS.?CYLINDER|HP.?GAS|INDIAN.?OIL|BHARAT.?PETROL|HINDUSTAN.?PETROL|GAIL|IGL|MGL", category: "Fuel", itc_status: "BLOCKED", gst_rate: 5, block_reason: "Motor fuel — blocked (excluded from GST except for further supply)", section: "17(5)", priority: 85 },

  // Insurance — Business Eligible
  { pattern: "FIRE.?INSURANCE|BURGLARY.*INSURANCE|MARINE.?INSURANCE|WORKMEN.?COMP|WORKERS.?COMP|LIABILITY.*INSURANCE|PROPERTY.*INSURANCE|INDEMNITY|FIDELITY.*GUARANTEE|ENGINEERING.*INSURANCE|PROJECT.*INSURANCE|CYBER.*INSURANCE|DIRECTOR.*LIAB", category: "Business Insurance", itc_status: "ELIGIBLE", gst_rate: 18, priority: 80 },
  { pattern: "HDFC.?ERGO|ICICI.?LOMBARD|TATA.?AIG|BAJAJ.?ALLIANZ.*GENERAL|NEW.?INDIA.?ASSURANCE|ORIENTAL.*INSURANCE|UNITED.*INDIA.*INSURANCE|NATIONAL.*INSURANCE.*CO|RELIANCE.*GENERAL|IFFCO.?TOKIO|UNIVERSAL.?SOMPO|SBI.?GENERAL|FUTURE.*GENERALI|CHOLA.?MS|ROYAL.?SUNDARAM", category: "General Insurance", itc_status: "ELIGIBLE", gst_rate: 18, priority: 70 },

  // Non-ITC Payments
  { pattern: "SALARY|WAGE|PAY.?ROLL|STAFF.?SAL|EMPLOYEE.*PAY|LABOUR.?PAY|HONORARIUM|STIPEND", category: "Payroll", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Salary/wages not subject to GST", section: null, priority: 95 },
  { pattern: "PF.?PMT|ESI.?PMT|PROVIDENT.?FUND|EMPLOYEE.?STATE|EPF|EPFO|ESIC", category: "Statutory Contributions", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "PF/ESI not subject to GST", section: null, priority: 95 },
  { pattern: "\\bEMI\\b|LOAN.?REPAY|LOAN.?A/C|INSTALLMENT|PRINCIPAL\\.|INTEREST.?ON.?LOAN|MORTGAGE|HOME.?LOAN|CAR.?LOAN|PERSONAL.?LOAN|BUSINESS.?LOAN|OVERDRAFT.*REPAY|SELF.?LOAN", category: "Loan Repayment", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Loan repayment — not eligible for ITC", section: null, priority: 90 },
  { pattern: "GST.?PMT|GST.?PAY|TAX.?PAY|TDS.?PMT|INCOME.?TAX|ADVANCE.?TAX|CHALLAN.*TAX|CUSTOMS.*DUTY", category: "Tax Payment", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Tax payment — not a purchase", section: null, priority: 95 },
  { pattern: "BANK.?CHARGES|CHGS|CHARGES|SMS.?ALERT|MIN.?BAL|NON.?MAINT|ANNUAL.?FEE|CHEQUE.?BOOK|CASH.?HANDL|NACH.?RETURN|ECS.?RETURN|DEBIT.?CARD.*FEE|CREDIT.?CARD.*FEE|ATM.?CARD.*FEE", category: "Bank Charges", itc_status: "ELIGIBLE", gst_rate: 18, priority: 85 },
  { pattern: "INTEREST.?CR|INT.?PD|INT.?CR|FD.?INT|SAVINGS.?INT|INTEREST.?ON.*FIXED|RD.?INT", category: "Interest Income", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Interest income — not a purchase", section: null, priority: 90 },
  { pattern: "INTEREST.?DR|INT.?DR|OD.?INT|CASH.?CREDIT.*INT|OVERDRAFT.*INT", category: "Interest Expense", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Interest expense — not subject to GST", section: null, priority: 90 },

  // Cash Transactions
  { pattern: "ATM.?WDL|CASH.?WDL|CASH.?WITH|SELF.?WITHDRAWAL|BY.?CASH.*WDL|NON.?HOME.?ATM", category: "Cash Withdrawal", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Cash withdrawal — not a purchase", section: null, priority: 98 },
  { pattern: "CDM|CASH.?DEP|CASH.?DEPO|BY.?CASH.*DEP|CASH.?REMIT", category: "Cash Deposit", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Cash deposit — not a purchase", section: null, priority: 98 },
  { pattern: "CHQ.?DEP|CHQ.?DEPO|CHEQUE.?DEP|BY.?CLG|CLG.*DEP|INWARD.?CLG|CHEQUE.*REC", category: "Cheque Deposit", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Incoming funds — not a purchase", section: null, priority: 95 },
  { pattern: "CHQ.?PAID|CHQ.?ISS|CHEQUE.?PAID|OUTWARD.?CLG|CLG.?OUT|CHQ.?NO", category: "Cheque Payment", itc_status: "UNKNOWN", gst_rate: 0, block_reason: "Cheque payment — needs vendor identification", section: null, priority: 85 },

  // Entertainment (Blocked)
  { pattern: "MOVIE|CINEMA|PVR|INOX|CINE.?POLIS|BOOK.?MY.?SHOW|TICKET.*MOVIE|MULTIPLEX|THEATRE", category: "Entertainment", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Entertainment — blocked under Section 17(5)", section: "17(5)", priority: 85 },
  { pattern: "NETFLIX|HOTSTAR|DISNEY|AMAZON.?PRIME|SPOTIFY|YOUTUBE.?PREMIUM|APPLE.?MUSIC|GANA|WYNK|AUDIBLE", category: "Entertainment Subscription", itc_status: "BLOCKED", gst_rate: 18, block_reason: "Personal entertainment — blocked", section: "17(5)(e)", priority: 85 },
];

interface RuleCache {
  rules: ClassificationRule[];
  timestamp: number;
}

let volatileCache: RuleCache | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export function getEmbeddedRules(): ClassificationRule[] {
  return EMBEDDED_RULES;
}

export function isCacheValid(cache: RuleCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL;
}

export function setCachedRules(rules: ClassificationRule[]): RuleCache {
  volatileCache = { rules, timestamp: Date.now() };
  return volatileCache;
}

export function getCachedRules(): RuleCache | null {
  return isCacheValid(volatileCache) ? volatileCache : null;
}

export async function loadRules(): Promise<ClassificationRule[]> {
  const cached = getCachedRules();
  if (cached) return cached.rules;

  try {
    const { supabaseServer } = await import("@/lib/supabase/client");
    const { data, error } = await supabaseServer
      .from("classification_rules")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (!error && data && data.length > 0) {
      const rules = data as ClassificationRule[];
      setCachedRules(rules);
      return rules;
    }
  } catch {
    // Supabase not available — use embedded rules
  }

  return EMBEDDED_RULES;
}

export function matchRules(
  narration: string,
  rules: ClassificationRule[],
): ClassificationRule[] {
  const normalized = narration.toUpperCase().replace(/\s+/g, " ");
  const matches: ClassificationRule[] = [];

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern.replace(/\.\?/g, ".?"), "i");
    if (regex.test(normalized)) {
      matches.push(rule);
    }
  }

  return matches;
}
