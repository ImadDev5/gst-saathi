import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

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

    const amountMatch = expense_text.match(/[₹₨]?\s*([\d,]+\.?\d*)/);
    const amountRupees = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
    const amountPaise = Math.round(amountRupees * 100);

    const text = expense_text.toUpperCase().replace(/[^A-Z0-9 ]/g, " ");

    // Load vendors from DB for dynamic matching
    let vendors: any[] = [];
    try {
      const { data } = await supabaseServer
        .from("vendors")
        .select("id, name, category, keywords, itc_status, default_gst_rate, is_oidar");
      vendors = data || [];
    } catch {
      // DB unavailable — use built-in fallback below
    }

    // Match against vendor keywords (same logic as Inngest pipeline)
    for (const v of vendors) {
      const keywords = v.keywords || [];
      for (const kw of keywords) {
        if (text.includes(kw.toUpperCase())) {
          const gstRate = v.default_gst_rate || 18;
          const gstAmount = amountPaise > 0 ? Math.round(amountPaise * gstRate / (100 + gstRate)) : 0;
          const isOidar = v.category?.toUpperCase().includes("OIDAR") || v.is_oidar;

          if (v.itc_status === "BLOCKED") {
            return NextResponse.json({
              success: true,
              data: {
                vendor: v.name,
                category: v.category || "Unknown",
                gst_rate: gstRate,
                gst_amount_paise: gstAmount,
                itc_status: "BLOCKED",
                itc_status_label: `Blocked — Matched Vendor: ${v.name} under S.17(5)`,
                block_reason: `Matched Vendor configured as Blocked Credit under S.17(5)`,
                rcm_applicable: false,
                action: "Do not claim ITC — vendor configured as blocked",
                confidence: 0.95,
              },
            });
          }

          if (isOidar || v.itc_status === "RCM") {
            return NextResponse.json({
              success: true,
              data: {
                vendor: v.name,
                category: v.category || "Foreign Digital Service",
                gst_rate: gstRate,
                gst_amount_paise: gstAmount,
                itc_status: "RCM",
                itc_status_label: "RCM — You must pay GST under Reverse Charge",
                block_reason: null,
                rcm_applicable: true,
                rcm_amount_paise: gstAmount,
                action: `Pay ${gstRate}% GST under RCM. Claim ITC in the same month's GSTR-3B.`,
                confidence: 0.9,
              },
            });
          }

          return NextResponse.json({
            success: true,
            data: {
              vendor: v.name,
              category: v.category || "Business",
              gst_rate: gstRate,
              gst_amount_paise: gstAmount,
              itc_status: "ELIGIBLE",
              itc_status_label: "Eligible — get a B2B invoice with your GSTIN",
              block_reason: null,
              rcm_applicable: false,
              action: `Ensure you have a B2B invoice with your GSTIN from ${v.name}`,
              confidence: 0.85,
            },
          });
        }
      }
    }

    // Built-in fallback matching (when DB unavailable)
    const blocked175: Record<string, { category: string; rate: number }> = {
      'SWIGGY': { category: 'Food Delivery', rate: 5 },
      'ZOMATO': { category: 'Food Delivery', rate: 5 },
      'FOOD': { category: 'Food & Beverages', rate: 5 },
      'RESTAURANT': { category: 'Restaurant', rate: 5 },
      'INSURANCE': { category: 'Insurance', rate: 18 },
      'GYM': { category: 'Health Club', rate: 18 },
      'SALON': { category: 'Beauty', rate: 18 },
      'UBER': { category: 'Transport', rate: 5 },
      'OLA': { category: 'Transport', rate: 5 },
    };

    for (const [keyword, info] of Object.entries(blocked175)) {
      if (text.includes(keyword)) {
        const gstAmount = amountPaise > 0 ? Math.round(amountPaise * info.rate / (100 + info.rate)) : 0;
        return NextResponse.json({
          success: true,
          data: {
            vendor: keyword.charAt(0) + keyword.slice(1).toLowerCase(),
            category: info.category,
            gst_rate: info.rate,
            gst_amount_paise: gstAmount,
            itc_status: "BLOCKED",
            itc_status_label: `Blocked — Section 17(5) ${info.category}`,
            block_reason: `Section 17(5) — ${info.category}`,
            rcm_applicable: false,
            action: "Do not claim ITC — this is a blocked credit under Section 17(5)",
            confidence: 0.95,
          },
        });
      }
    }

    const oidarFallback: Record<string, { name: string }> = {
      'GOOGLE ADS': { name: 'Google Ads' },
      'FACEBOOK ADS': { name: 'Meta Ads' },
      'AWS': { name: 'Amazon Web Services' },
      'ADOBE': { name: 'Adobe' },
      'MICROSOFT': { name: 'Microsoft' },
      'ZOOM': { name: 'Zoom' },
      'SLACK': { name: 'Slack' },
      'GITHUB': { name: 'GitHub' },
      'NETFLIX': { name: 'Netflix' },
      'SPOTIFY': { name: 'Spotify' },
    };

    for (const [keyword, vendor] of Object.entries(oidarFallback)) {
      if (text.includes(keyword)) {
        const gstAmount = amountPaise > 0 ? Math.round(amountPaise * 18 / 118) : 0;
        return NextResponse.json({
          success: true,
          data: {
            vendor: vendor.name,
            category: "Foreign Digital Service (OIDAR)",
            gst_rate: 18,
            gst_amount_paise: gstAmount,
            itc_status: "RCM",
            itc_status_label: "RCM — You must pay 18% IGST under Reverse Charge",
            block_reason: null,
            rcm_applicable: true,
            rcm_amount_paise: gstAmount,
            action: "Pay 18% IGST under RCM. Claim ITC in the same month's GSTR-3B.",
            confidence: 0.92,
          },
        });
      }
    }

    const eligibleFallback: Record<string, { name: string; rate: number; category: string }> = {
      'INTERNET': { name: 'Internet Service', rate: 18, category: 'Telecom' },
      'AIRTEL': { name: 'Airtel', rate: 18, category: 'Telecom' },
      'RENT': { name: 'Office Rent', rate: 18, category: 'Rental' },
      'COURIER': { name: 'Courier Service', rate: 18, category: 'Logistics' },
      'ELECTRICITY': { name: 'Electricity', rate: 18, category: 'Utilities' },
      'FLIPKART': { name: 'Flipkart', rate: 18, category: 'E-Commerce' },
      'OFFICE': { name: 'Office Supplies', rate: 18, category: 'Office' },
    };

    for (const [keyword, vendor] of Object.entries(eligibleFallback)) {
      if (text.includes(keyword)) {
        const gstAmount = amountPaise > 0 ? Math.round(amountPaise * vendor.rate / (100 + vendor.rate)) : 0;
        return NextResponse.json({
          success: true,
          data: {
            vendor: vendor.name,
            category: vendor.category,
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

    return NextResponse.json({
      success: true,
      data: {
        vendor: null,
        category: "Unknown",
        gst_rate: 18,
        gst_amount_paise: amountPaise > 0 ? Math.round(amountPaise * 18 / 118) : 0,
        itc_status: "UNKNOWN",
        itc_status_label: "Could not determine — upload a full bank statement for detailed analysis",
        block_reason: null,
        rcm_applicable: false,
        action: "Upload your bank statement CSV for comprehensive vendor matching",
        confidence: 0.3,
      },
    });
  } catch (err) {
    console.error("ITC check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
