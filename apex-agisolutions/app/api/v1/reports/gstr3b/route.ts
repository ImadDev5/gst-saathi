import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { mapGSTR3B } from "@/lib/engine/gstr-mapper";

/**
 * GET /api/v1/reports/gstr3b?period=2024-03
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period");
    if (!period) return NextResponse.json({ error: "period query param required (YYYY-MM)" }, { status: 400 });

    const [year, month] = period.split("-").map(Number);
    const start = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const end = new Date(year, month, 0).toISOString().split("T")[0];

    const { data: entries, error } = await supabaseServer
      .from("entries")
      .select("id, entry_type, entry_date, customer_type, party_gstin, party_name, entry_line_items(*)")
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .gte("entry_date", start)
      .lte("entry_date", end);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const gstr3b = mapGSTR3B(entries || []);

    return NextResponse.json({ success: true, data: gstr3b, meta: { period } });
  } catch (err) {
    console.error("GSTR-3B error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
