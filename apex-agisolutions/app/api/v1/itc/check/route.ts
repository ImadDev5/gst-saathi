import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/itc/check
 * Free-tier single expense ITC checker (rate-limited to 5/day by IP)
 * No auth required
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { expense_text } = body;

    if (!expense_text || typeof expense_text !== "string" || expense_text.trim().length < 3) {
      return NextResponse.json(
        { error: "Please provide a valid expense description" },
        { status: 400 }
      );
    }

    // Parse amount from text if present (e.g., "Adobe CC ₹5664" → 5664)
    const amountMatch = expense_text.match(/[\₹₨]?\s*([\d,]+\.?\d*)/);
    const amountRupees = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
    const amountPaise = Math.round(amountRupees * 100);

    const text = expense_text.toUpperCase().replace(/[^A-Z0-9 ]/g, " ");

    // Section 17(5) blocked categories
    const blocked175: Record<string, string> = {
      'SWIGGY': 'Food Delivery',
      'ZOMATO': 'Food Delivery',
      'FOOD': 'Food & Beverages',
      'RESTAURANT': 'Restaurant',
      'HOTEL FOOD': 'Outdoor Catering',
      'GYM': 'Health Club',
      'SALON': 'Beauty & Personal Care',
      'INSURANCE': 'Insurance (non-business)',
      'CAR FUEL': 'Motor Vehicle Fuel',
      'PETROL': 'Motor Vehicle Fuel',
      'DIESEL': 'Motor Vehicle Fuel',
    };

    // Check blocked first
    for (const [keyword, category] of Object.entries(blocked175)) {
      if (text.includes(keyword)) {
        const gstRate = keyword.includes('FOOD') || keyword.includes('SWIGGY') || keyword.includes('ZOMATO') ? 5 : 18;
        const gstAmount = amountPaise > 0 ? Math.round(amountPaise * gstRate / (100 + gstRate)) : 0;
        return NextResponse.json({
          success: true,
          data: {
            vendor: keyword.charAt(0) + keyword.slice(1).toLowerCase(),
            category,
            gst_rate: gstRate,
            gst_amount_paise: gstAmount,
            itc_status: "BLOCKED",
            itc_status_label: `Blocked — Section 17(5) ${category}`,
            block_reason: `Section 17(5) — ${category}`,
            rcm_applicable: false,
            action: "Do not claim ITC — this is a blocked credit under Section 17(5)",
            confidence: 0.95,
          },
        });
      }
    }

    // OIDAR / RCM vendors
    const oidarVendors: Record<string, { name: string; sac: string }> = {
      'GOOGLE ADS': { name: 'Google Ads', sac: '998314' },
      'FACEBOOK ADS': { name: 'Meta Ads', sac: '998314' },
      'META ADS': { name: 'Meta Ads', sac: '998314' },
      'LINKEDIN ADS': { name: 'LinkedIn Ads', sac: '998314' },
      'AWS': { name: 'Amazon Web Services', sac: '998315' },
      'AZURE': { name: 'Microsoft Azure', sac: '998315' },
      'GOOGLE CLOUD': { name: 'Google Cloud', sac: '998315' },
      'ZOOM': { name: 'Zoom Video', sac: '998314' },
      'SLACK': { name: 'Slack', sac: '998314' },
      'FIGMA': { name: 'Figma', sac: '998314' },
      'NOTION': { name: 'Notion', sac: '998314' },
      'ADOBE': { name: 'Adobe', sac: '998314' },
      'CANVA': { name: 'Canva', sac: '998314' },
      'GITHUB': { name: 'GitHub', sac: '998314' },
    };

    for (const [keyword, vendor] of Object.entries(oidarVendors)) {
      if (text.includes(keyword)) {
        const gstAmount = amountPaise > 0 ? Math.round(amountPaise * 18 / 118) : 0;
        return NextResponse.json({
          success: true,
          data: {
            vendor: vendor.name,
            category: "Foreign Digital Service (OIDAR)",
            hsn_sac: vendor.sac,
            gst_rate: 18,
            gst_amount_paise: gstAmount,
            itc_status: "RCM",
            itc_status_label: "RCM — You must pay 18% IGST under Reverse Charge",
            block_reason: null,
            rcm_applicable: true,
            rcm_amount_paise: gstAmount,
            action: `Pay 18% IGST under RCM. Claim ITC in the same month's GSTR-3B.`,
            confidence: 0.92,
          },
        });
      }
    }

    // Common eligible vendors
    const eligibleVendors: Record<string, { name: string; rate: number; sac: string; category: string }> = {
      'INTERNET': { name: 'Internet Service', rate: 18, sac: '998422', category: 'Telecom' },
      'AIRTEL': { name: 'Airtel', rate: 18, sac: '998422', category: 'Telecom' },
      'JIO': { name: 'Jio', rate: 18, sac: '998422', category: 'Telecom' },
      'VODAFONE': { name: 'Vodafone', rate: 18, sac: '998422', category: 'Telecom' },
      'RENT': { name: 'Office Rent', rate: 18, sac: '997212', category: 'Rental' },
      'OFFICE': { name: 'Office Supplies', rate: 18, sac: '998599', category: 'Office' },
      'STATIONERY': { name: 'Stationery', rate: 12, sac: '482010', category: 'Office' },
      'COURIER': { name: 'Courier Service', rate: 18, sac: '996812', category: 'Logistics' },
      'ELECTRICITY': { name: 'Electricity', rate: 18, sac: '996511', category: 'Utilities' },
    };

    for (const [keyword, vendor] of Object.entries(eligibleVendors)) {
      if (text.includes(keyword)) {
        const gstAmount = amountPaise > 0 ? Math.round(amountPaise * vendor.rate / (100 + vendor.rate)) : 0;
        return NextResponse.json({
          success: true,
          data: {
            vendor: vendor.name,
            category: vendor.category,
            hsn_sac: vendor.sac,
            gst_rate: vendor.rate,
            gst_amount_paise: gstAmount,
            itc_status: "ELIGIBLE",
            itc_status_label: "Eligible — get a B2B invoice with your GSTIN",
            block_reason: null,
            rcm_applicable: false,
            action: `Ensure you have a B2B invoice with your GSTIN from ${vendor.name}`,
            confidence: 0.85,
          },
        });
      }
    }

    // Unknown — couldn't match
    return NextResponse.json({
      success: true,
      data: {
        vendor: null,
        category: "Unknown",
        gst_rate: 18,
        gst_amount_paise: amountPaise > 0 ? Math.round(amountPaise * 18 / 118) : 0,
        itc_status: "UNKNOWN",
        itc_status_label: "Could not determine — upload a full statement for better results",
        block_reason: null,
        rcm_applicable: false,
        action: "Upload your bank statement CSV for detailed analysis",
        confidence: 0.3,
      },
    });
  } catch (err) {
    console.error("ITC check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
