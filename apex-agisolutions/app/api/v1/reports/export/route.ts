import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * POST /api/v1/reports/export
 * Triggers report generation. For MVP, generates JSON summary stored in reports table.
 * PDF/Excel generation via @react-pdf/renderer and exceljs to be added when deps installed.
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session } = await supabaseServer
      .from("trial_sessions")
      .select("id")
      .eq("token", token)
      .eq("status", "ACTIVE")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { statement_id, report_type = "ITC_SUMMARY" } = body;

    // Fetch transactions
    let query = supabaseServer
      .from("transactions")
      .select("*")
      .eq("trial_id", session.id);

    if (statement_id) query = query.eq("statement_id", statement_id);

    const { data: transactions, error: txnError } = await query;

    if (txnError) {
      return NextResponse.json({ error: txnError.message }, { status: 500 });
    }

    const txns = transactions || [];

    // Compute summary
    const summaryJson = {
      generatedAt: new Date().toISOString(),
      reportType: report_type,
      totalTransactions: txns.length,
      eligible: { count: 0, totalPaise: 0 },
      blocked: { count: 0, totalPaise: 0 },
      rcm: { count: 0, totalPaise: 0 },
      atRisk: { count: 0, totalPaise: 0 },
      unknown: { count: 0, totalPaise: 0 },
      totalGstPaise: 0,
      totalAmountPaise: 0,
      topVendors: [] as { name: string; amount: number; status: string }[],
      blockedCategories: [] as { reason: string; count: number; amount: number }[],
    };

    const vendorMap = new Map<string, { amount: number; status: string }>();
    const blockMap = new Map<string, { count: number; amount: number }>();

    txns.forEach((t: {
      itc_status: string;
      gst_amount: number;
      amount: number;
      mapped_vendor_name: string | null;
      block_reason: string | null;
    }) => {
      summaryJson.totalGstPaise += t.gst_amount || 0;
      summaryJson.totalAmountPaise += t.amount || 0;

      const amt = t.gst_amount || 0;
      switch (t.itc_status) {
        case "ELIGIBLE":
          summaryJson.eligible.count++;
          summaryJson.eligible.totalPaise += amt;
          break;
        case "BLOCKED":
          summaryJson.blocked.count++;
          summaryJson.blocked.totalPaise += amt;
          if (t.block_reason) {
            const existing = blockMap.get(t.block_reason) || { count: 0, amount: 0 };
            existing.count++;
            existing.amount += amt;
            blockMap.set(t.block_reason, existing);
          }
          break;
        case "RCM":
          summaryJson.rcm.count++;
          summaryJson.rcm.totalPaise += amt;
          break;
        default:
          summaryJson.unknown.count++;
          summaryJson.unknown.totalPaise += amt;
      }

      if (t.mapped_vendor_name) {
        const existing = vendorMap.get(t.mapped_vendor_name) || { amount: 0, status: t.itc_status };
        existing.amount += t.amount || 0;
        vendorMap.set(t.mapped_vendor_name, existing);
      }
    });

    summaryJson.topVendors = Array.from(vendorMap.entries())
      .map(([name, v]) => ({ name, amount: v.amount, status: v.status }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    summaryJson.blockedCategories = Array.from(blockMap.entries())
      .map(([reason, v]) => ({ reason, count: v.count, amount: v.amount }));

    // Insert report record
    const { data: report, error: reportError } = await supabaseServer
      .from("reports")
      .insert({
        trial_id: session.id,
        report_type,
        status: "COMPLETED",
        summary_json: summaryJson,
      })
      .select()
      .single();

    if (reportError) {
      return NextResponse.json({ error: reportError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        reportId: report.id,
        summary: summaryJson,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Report export error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
