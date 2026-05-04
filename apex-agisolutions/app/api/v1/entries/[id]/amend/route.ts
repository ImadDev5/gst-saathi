import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * POST /api/v1/entries/[id]/amend — Create amendment entry for a locked period
 * Auto-generates counter-entry in the next open period
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

    const { data: original } = await supabaseServer
      .from("entries")
      .select("*, entry_line_items(*)")
      .eq("id", id)
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .single();

    if (!original) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    if (!original.period_locked) {
      return NextResponse.json({
        error: "Entry is not in a locked period — edit directly instead",
      }, { status: 400 });
    }

    // Determine amendment type: opposite of original
    const isPurchase = original.entry_type === 'PURCHASE' || original.entry_type === 'PURCHASE_RETURN';
    const amendmentType = isPurchase ? 'PURCHASE_RETURN' : 'SALE_RETURN';

    // Use today's date (current open period)
    const today = new Date().toISOString().split("T")[0];

    // Create amendment entry (negated amounts)
    const { data: amendment, error: amendError } = await supabaseServer
      .from("entries")
      .insert({
        trial_id: session.id,
        entry_type: amendmentType,
        entry_date: today,
        payment_mode: original.payment_mode,
        customer_type: original.customer_type,
        party_name: original.party_name,
        party_gstin: original.party_gstin,
        invoice_number: original.invoice_number ? `AMEND-${original.invoice_number}` : null,
        has_invoice: false,
        period_locked: false,
        is_amendment: true,
        original_entry_id: original.id,
        remarks: `Amendment for entry dated ${original.entry_date}`,
      })
      .select()
      .single();

    if (amendError) {
      return NextResponse.json({ error: amendError.message }, { status: 500 });
    }

    // Copy line items with negated amounts
    const amendedItems = (original.entry_line_items || []).map((li: any) => ({
      entry_id: amendment.id,
      product_id: li.product_id,
      product_name: li.product_name,
      hsn_code: li.hsn_code,
      quantity: li.quantity,
      unit: li.unit,
      amount_paise: -li.amount_paise,
      rate_paise: li.rate_paise,
      taxable_paise: -li.taxable_paise,
      gst_rate: li.gst_rate,
      cgst_paise: -li.cgst_paise,
      sgst_paise: -li.sgst_paise,
      igst_paise: -li.igst_paise,
      total_gst_paise: -li.total_gst_paise,
      total_paise: -li.total_paise,
      itc_status: li.itc_status,
      itc_amount_paise: -li.itc_amount_paise,
      block_reason: li.block_reason,
    }));

    const { error: itemsError } = await supabaseServer
      .from("entry_line_items")
      .insert(amendedItems);

    if (itemsError) {
      // Rollback
      await supabaseServer.from("entries").delete().eq("id", amendment.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Audit log
    await supabaseServer.from("audit_logs").insert({
      trial_id: session.id,
      entity_type: 'AMENDMENT',
      entity_id: original.id,
      action: 'AMENDMENT',
      new_value: JSON.stringify({ amendment_entry_id: amendment.id, amendment_type: amendmentType }),
      user_agent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        amendment,
        original_id: original.id,
      },
      message: `Amendment created as ${amendmentType} in current period. This reverses the original entry.`,
    }, { status: 201 });
  } catch (err) {
    console.error("Amendment error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
