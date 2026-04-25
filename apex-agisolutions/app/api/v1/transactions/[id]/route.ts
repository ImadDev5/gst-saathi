import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * PATCH /api/v1/transactions/[id]
 * Manual override of ITC classification
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { itc_status, override_reason } = body;

    const validStatuses = ['ELIGIBLE', 'BLOCKED', 'CONDITIONAL', 'RCM', 'UNKNOWN'];
    if (!validStatuses.includes(itc_status)) {
      return NextResponse.json({ error: "Invalid itc_status value" }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabaseServer
      .from("transactions")
      .select("id, itc_status, trial_id")
      .eq("id", id)
      .eq("trial_id", session.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Update transaction
    const { data: updated, error } = await supabaseServer
      .from("transactions")
      .update({
        itc_status,
        block_reason: override_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Transaction override error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
