import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * POST /api/v1/entries/[id]/ca-override — Force ITC override with CA approval
 * Body: { line_item_id: string, force_reason: string }
 */

async function getSession(token: string | undefined) {
  if (!token) return null;
  const { data } = await supabaseServer
    .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
  return data;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { line_item_id, force_reason } = body;

    if (!line_item_id || !force_reason) {
      return NextResponse.json({
        error: "line_item_id and force_reason are required",
      }, { status: 400 });
    }

    // Verify line item belongs to this entry
    const { data: lineItem } = await supabaseServer
      .from("entry_line_items")
      .select("id, itc_status, itc_amount_paise, total_gst_paise, entry_id")
      .eq("id", line_item_id)
      .eq("entry_id", id)
      .is("deleted_at", null)
      .single();

    if (!lineItem) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    if (lineItem.itc_status !== 'BLOCKED') {
      return NextResponse.json({
        error: `Cannot override — current ITC status is ${lineItem.itc_status}`,
      }, { status: 400 });
    }

    // Override ITC status to ELIGIBLE and restore ITC amount
    const { error: updateError } = await supabaseServer
      .from("entry_line_items")
      .update({
        itc_status: 'ELIGIBLE',
        itc_amount_paise: lineItem.total_gst_paise,
        block_reason: null,
        force_override_reason: force_reason,
      })
      .eq("id", line_item_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Audit log
    await supabaseServer.from("audit_logs").insert({
      trial_id: session.id,
      entity_type: 'LINE_ITEM',
      entity_id: line_item_id,
      action: 'OVERRIDE',
      field_name: 'itc_status',
      old_value: 'BLOCKED',
      new_value: `ELIGIBLE — CA override: ${force_reason}`,
      user_agent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      message: "ITC override applied. CA approval recorded in audit log.",
      data: {
        line_item_id,
        itc_status: 'ELIGIBLE',
        itc_amount_paise: lineItem.total_gst_paise,
        force_override_reason: force_reason,
      },
    });
  } catch (err) {
    console.error("CA override error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
