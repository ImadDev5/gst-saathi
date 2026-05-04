import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { AlgorithmicClassifier } from "@/lib/engine/algorithmic-classifier";

const algoClassifier = new AlgorithmicClassifier();

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
      // DB unavailable — fall through to algorithmic classifier
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

    // Use AlgorithmicClassifier as the single fallback engine
    const algo = algoClassifier.classify(expense_text, amountPaise);

    const statusLabels: Record<string, string> = {
      ELIGIBLE: "Eligible — get a B2B invoice with your GSTIN",
      BLOCKED: `Blocked — ${algo.block_reason || "Section 17(5)"}`,
      RCM: "RCM — You must pay GST under Reverse Charge",
      UNKNOWN: "Could not determine — upload a full bank statement for detailed analysis",
      AT_RISK: "At Risk — vendor may not have filed GSTR-1",
      NEEDS_INVOICE: "Needs Invoice — verify vendor GST registration",
      TIME_BARRED: "Time Barred — ITC deadline has passed",
      PERSONAL: "Personal — not a business expense",
    };

    const actions: Record<string, string> = {
      ELIGIBLE: `Ensure you have a B2B invoice with your GSTIN${algo.mapped_vendor_name ? ` from ${algo.mapped_vendor_name}` : ""}`,
      BLOCKED: "Do not claim ITC — this is a blocked credit under Section 17(5)",
      RCM: `Pay GST under RCM. Claim ITC in the same month's GSTR-3B.`,
      UNKNOWN: "Upload your bank statement CSV for comprehensive vendor matching",
      AT_RISK: "Follow up with vendor to file GSTR-1",
      NEEDS_INVOICE: "Request B2B invoice from vendor with your GSTIN",
      TIME_BARRED: "Flag for CA records — ITC cannot be claimed",
      PERSONAL: "Not a business expense",
    };

    const algoGstAmount = algo.gst_amount > 0 ? algo.gst_amount : (amountPaise > 0 ? Math.round(amountPaise * 18 / 118) : 0);

    return NextResponse.json({
      success: true,
      data: {
        vendor: algo.mapped_vendor_name || (algo.category || "Unknown"),
        category: algo.category || "Unknown",
        gst_rate: algo.gst_amount > 0 ? 18 : 18,
        gst_amount_paise: algoGstAmount,
        itc_status: algo.itc_status,
        itc_status_label: statusLabels[algo.itc_status] || "Could not determine",
        block_reason: algo.block_reason,
        rcm_applicable: algo.itc_status === "RCM",
        rcm_amount_paise: algo.itc_status === "RCM" ? algoGstAmount : 0,
        action: algo.action_required || actions[algo.itc_status] || "Upload your bank statement for detailed analysis",
        confidence: algo.itc_confidence,
      },
    });
  } catch (err) {
    console.error("ITC check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
