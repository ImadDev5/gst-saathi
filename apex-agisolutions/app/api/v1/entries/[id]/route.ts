import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { calculateGST } from "@/lib/engine/gst-calculator";

/**
 * PUT  /api/v1/entries/[id] — Update an entry (rejected if period locked)
 * DELETE /api/v1/entries/[id] — Soft delete (rejected if period locked)
 */

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    // Check entry exists and belongs to session
    const { data: existing } = await supabaseServer
      .from("retail_entries")
      .select("id, period_locked, trial_id")
      .eq("id", id)
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    if (existing.period_locked) {
      return NextResponse.json({
        error: "Cannot edit — this period has been filed",
        code: "PERIOD_LOCKED"
      }, { status: 409 });
    }

    const body = await req.json();
    const {
      entry_type, entry_date, payment_mode, customer_type,
      party_name, party_gstin, invoice_number,
      product_name, hsn_code, quantity, unit, rate_paise, gst_rate,
      is_price_sensitive = false, threshold_paise = 100000, remarks,
    } = body;

    // Recalculate GST
    const gstBreakdown = calculateGST(
      quantity || 1, rate_paise, gst_rate, false, is_price_sensitive, threshold_paise
    );

    const { data: updated, error } = await supabaseServer
      .from("retail_entries")
      .update({
        entry_type, entry_date, payment_mode, customer_type,
        party_name, party_gstin, invoice_number,
        product_name, hsn_code, quantity, unit, rate_paise,
        taxable_paise: gstBreakdown.taxablePaise,
        gst_rate: gstBreakdown.gstRate,
        cgst_paise: gstBreakdown.cgstPaise,
        sgst_paise: gstBreakdown.sgstPaise,
        igst_paise: gstBreakdown.igstPaise,
        total_paise: gstBreakdown.totalPaise,
        itc_eligible: entry_type === "PURCHASE" || entry_type === "PURCHASE_RETURN",
        remarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Entry update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: existing } = await supabaseServer
      .from("retail_entries")
      .select("id, period_locked")
      .eq("id", id)
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    if (existing.period_locked) {
      return NextResponse.json({
        error: "Cannot delete — this period has been filed",
        code: "PERIOD_LOCKED"
      }, { status: 409 });
    }

    // Soft delete
    const { error } = await supabaseServer
      .from("retail_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Entry delete error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
