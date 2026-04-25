import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET /api/v1/dashboard/summary
 * Returns Module A dashboard summary metrics
 */
export async function GET(req: NextRequest) {
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

    // Fetch all transactions for this session
    const { data: transactions } = await supabaseServer
      .from("transactions")
      .select("itc_status, gst_amount, amount, transaction_type")
      .eq("trial_id", session.id);

    // Fetch statement count
    const { count: statementCount } = await supabaseServer
      .from("statements")
      .select("id", { count: "exact" })
      .eq("trial_id", session.id);

    const txns = transactions || [];

    let totalEligiblePaise = 0;
    let totalBlockedPaise = 0;
    let totalAtRiskPaise = 0;
    let totalRcmPaise = 0;
    let totalNeedsInvoicePaise = 0;
    let totalUnknownPaise = 0;
    let totalTransactions = txns.length;

    txns.forEach((t: { itc_status: string; gst_amount: number }) => {
      const amt = t.gst_amount || 0;
      switch (t.itc_status) {
        case 'ELIGIBLE':       totalEligiblePaise += amt; break;
        case 'BLOCKED':        totalBlockedPaise += amt; break;
        case 'AT_RISK':        totalAtRiskPaise += amt; break;
        case 'RCM':            totalRcmPaise += amt; break;
        case 'CONDITIONAL':
        case 'NEEDS_INVOICE':  totalNeedsInvoicePaise += amt; break;
        default:               totalUnknownPaise += amt;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        statementCount: statementCount || 0,
        totalTransactions,
        totalEligiblePaise,
        totalBlockedPaise,
        totalAtRiskPaise,
        totalRcmPaise,
        totalNeedsInvoicePaise,
        totalUnknownPaise,
      },
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
