import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET /api/v1/transactions
 * List classified transactions with filtering and pagination
 * Query params: statement_id, itc_status, page, per_page
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate trial session
    const { data: session } = await supabaseServer
      .from("trial_sessions")
      .select("id")
      .eq("token", token)
      .eq("status", "ACTIVE")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const url = new URL(req.url);
    const statementId = url.searchParams.get("statement_id");
    const itcStatus = url.searchParams.get("itc_status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "50"), 100);
    const offset = (page - 1) * perPage;

    let query = supabaseServer
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("trial_id", session.id)
      .order("transaction_date", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (statementId) query = query.eq("statement_id", statementId);
    if (itcStatus) query = query.eq("itc_status", itcStatus);

    const { data: transactions, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute summary counts
    const { data: summary } = await supabaseServer
      .from("transactions")
      .select("itc_status, gst_amount")
      .eq("trial_id", session.id);

    const summaryByStatus: Record<string, { count: number; totalPaise: number }> = {};
    (summary || []).forEach((t: { itc_status: string; gst_amount: number }) => {
      if (!summaryByStatus[t.itc_status]) {
        summaryByStatus[t.itc_status] = { count: 0, totalPaise: 0 };
      }
      summaryByStatus[t.itc_status].count++;
      summaryByStatus[t.itc_status].totalPaise += t.gst_amount || 0;
    });

    return NextResponse.json({
      success: true,
      data: transactions,
      summary: summaryByStatus,
      meta: { page, perPage, total: count || 0 },
    });
  } catch (err) {
    console.error("Transaction list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
