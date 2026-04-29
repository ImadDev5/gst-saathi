import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { verifyUserSession, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/v1/dashboard/summary
 * Returns Module A dashboard summary metrics.
 * Strictly requires a valid user (trial_token) session.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyUserSession(req);
  if (!auth.authenticated) {
    return authErrorResponse(auth);
  }

  try {
    // Fetch all transactions for this session
    const { data: transactions } = await supabaseServer
      .from("transactions")
      .select("itc_status, gst_amount, amount, transaction_type")
      .eq("trial_id", auth.trialId);

    // Fetch statement count
    const { count: statementCount } = await supabaseServer
      .from("statements")
      .select("id", { count: "exact" })
      .eq("trial_id", auth.trialId);

    const txns = transactions || [];

    let totalEligiblePaise = 0;
    let totalBlockedPaise = 0;
    let totalAtRiskPaise = 0;
    let totalRcmPaise = 0;
    let totalNeedsInvoicePaise = 0;
    let totalUnknownPaise = 0;
    const totalTransactions = txns.length;

    txns.forEach((t: { itc_status: string; gst_amount: number }) => {
      const amt = t.gst_amount || 0;
      switch (t.itc_status) {
        case "ELIGIBLE":
          totalEligiblePaise += amt;
          break;
        case "BLOCKED":
          totalBlockedPaise += amt;
          break;
        case "AT_RISK":
          totalAtRiskPaise += amt;
          break;
        case "RCM":
          totalRcmPaise += amt;
          break;
        case "CONDITIONAL":
        case "NEEDS_INVOICE":
          totalNeedsInvoicePaise += amt;
          break;
        default:
          totalUnknownPaise += amt;
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
