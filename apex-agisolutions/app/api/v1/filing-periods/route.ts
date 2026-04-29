import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { period_month, period_year } = await req.json();
    if (!period_month || !period_year) {
      return NextResponse.json({ error: "period_month and period_year required" }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from("filing_periods")
      .select("id, status")
      .eq("trial_id", session.id)
      .eq("period_month", period_month)
      .eq("period_year", period_year)
      .maybeSingle();

    if (existing?.status === "FILED") {
      return NextResponse.json({ error: "Period already filed" }, { status: 409 });
    }

    const { data: filed, error } = await supabaseServer
      .from("filing_periods")
      .upsert({
        trial_id: session.id,
        period_month,
        period_year,
        status: "FILED",
        filed_at: new Date().toISOString(),
      }, { onConflict: "trial_id,period_month,period_year" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: filed });
  } catch (err) {
    console.error("Filing period error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
