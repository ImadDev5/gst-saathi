/**
 * RCM (Reverse Charge Mechanism) Detector
 * Flags transactions where the recipient must pay GST under reverse charge
 */

interface RCMResult {
  rcmApplicable: boolean;
  rcmRate: number;       // GST rate to apply
  rcmAmountPaise: number; // Tax payable in paise
  rcmType: string | null; // OIDAR | GTA | LEGAL | SPONSORSHIP | RENT
  explanation: string | null;
}

// OIDAR (Online Information Database Access and Retrieval) services — foreign digital
const OIDAR_KEYWORDS = [
  'GOOGLE ADS', 'GOOGLE ADV', 'GOOGLEADS', 'GOOGLE PAY ADV',
  'META ADS', 'FACEBOOK ADS', 'FB ADS', 'INSTAGRAM ADS',
  'LINKEDIN ADS', 'TWITTER ADS', 'X ADS',
  'ZOOM', 'ZOOM VIDEO', 'DROPBOX', 'SLACK',
  'NOTION', 'FIGMA', 'ADOBE', 'CANVA PRO',
  'MICROSOFT 365', 'GITHUB', 'ATLASSIAN',
  'AWS', 'AMAZON WEB', 'AZURE', 'GOOGLE CLOUD', 'GCP',
  'HEROKU', 'VERCEL', 'NETLIFY', 'DIGITALOCEAN',
];

// GTA (Goods Transport Agency) keywords
const GTA_KEYWORDS = ['TRANSPORT', 'TRUCKING', 'LOGISTICS FREIGHT', 'CONSIGNMENT', 'GTA'];

// Legal services
const LEGAL_KEYWORDS = ['ADVOCATE', 'LEGAL SERVICE', 'LAW FIRM', 'ATTORNEY'];

// Sponsorship
const SPONSORSHIP_KEYWORDS = ['SPONSORSHIP', 'SPONSOR FEE', 'EVENT SPONSOR'];

/**
 * Detect if a transaction is subject to Reverse Charge Mechanism
 */
export function detectRCM(
  narrationClean: string,
  amountPaise: number,
  vendorIsForeign: boolean,
  vendorIsOidar: boolean,
  category: string | null
): RCMResult {
  const narration = narrationClean.toUpperCase();

  // Check OIDAR (foreign digital services) — 18% IGST
  if (vendorIsOidar || vendorIsForeign) {
    for (const kw of OIDAR_KEYWORDS) {
      if (narration.includes(kw)) {
        const rcmAmount = Math.round(amountPaise * 18 / 118);
        return {
          rcmApplicable: true,
          rcmRate: 18,
          rcmAmountPaise: rcmAmount,
          rcmType: 'OIDAR',
          explanation: `OIDAR service from foreign entity — 18% IGST payable under RCM. Claimable as ITC in same month.`,
        };
      }
    }
  }

  // Check GTA — 5% or 12%
  for (const kw of GTA_KEYWORDS) {
    if (narration.includes(kw)) {
      const rcmRate = 5; // Default 5% for GTA
      const rcmAmount = Math.round(amountPaise * rcmRate / (100 + rcmRate));
      return {
        rcmApplicable: true,
        rcmRate,
        rcmAmountPaise: rcmAmount,
        rcmType: 'GTA',
        explanation: `Goods Transport Agency — ${rcmRate}% GST payable under RCM. Claimable if for business use.`,
      };
    }
  }

  // Check Legal services — 18%
  for (const kw of LEGAL_KEYWORDS) {
    if (narration.includes(kw) || (category && category.toUpperCase().includes(kw))) {
      const rcmAmount = Math.round(amountPaise * 18 / 118);
      return {
        rcmApplicable: true,
        rcmRate: 18,
        rcmAmountPaise: rcmAmount,
        rcmType: 'LEGAL',
        explanation: `Legal services from individual advocate — 18% GST payable under RCM. Claimable if for business.`,
      };
    }
  }

  // Check Sponsorship — 18%
  for (const kw of SPONSORSHIP_KEYWORDS) {
    if (narration.includes(kw)) {
      const rcmAmount = Math.round(amountPaise * 18 / 118);
      return {
        rcmApplicable: true,
        rcmRate: 18,
        rcmAmountPaise: rcmAmount,
        rcmType: 'SPONSORSHIP',
        explanation: `Sponsorship services — 18% GST payable under RCM. Claimable if business-related.`,
      };
    }
  }

  return {
    rcmApplicable: false,
    rcmRate: 0,
    rcmAmountPaise: 0,
    rcmType: null,
    explanation: null,
  };
}
