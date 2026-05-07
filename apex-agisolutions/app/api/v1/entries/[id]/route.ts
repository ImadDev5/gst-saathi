import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { validateEntry } from "@/lib/engine/entry-validator";
import type { LineItemInput } from "@/lib/engine/entry-validator";

/**
 * PUT    /api/v1/entries/[id] — Update entry + line items (audit-logged)
 * DELETE /api/v1/entries/[id] — Soft delete entry + line items
 */

async function getSession(token: string | undefined) {
  if (!token) return null;
  const { data } = await supabaseServer
    .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
  return data;
}

async function getBusinessGstin(token: string): Promise<string | null> {
  const { data: contact } = await supabaseServer
    .from("contacts")
    .select("gstin")
    .eq("assigned_token", token)
    .maybeSingle();
  return (contact as any)?.gstin || null;
}

function writeAuditLog(
  entry: any,
  updates: Record<string, any>,
  body: Record<string, any>,
) {
  const diffs = [];
  for (const [key, newVal] of Object.entries(updates)) {
    if (key === 'updated_at') continue;
    const oldVal = entry[key];
    const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '');
    const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '');
    if (oldStr !== newStr) {
      diffs.push({ field: key, old_value: oldStr, new_value: newStr });
    }
  }
  return diffs;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing } = await supabaseServer
      .from("entries")
      .select("*, entry_line_items!inner(*)")
      .eq("id", id)
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .single();

    // Filter out soft-deleted line items from the response for audit diff calculation
    if (existing) {
      existing.entry_line_items = (existing.entry_line_items || []).filter((li: any) => !li.deleted_at);
    }

    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    if (existing.period_locked) {
      return NextResponse.json({
        error: "Cannot edit — this period has been filed. Create an amendment instead.",
        code: "PERIOD_LOCKED",
      }, { status: 423 });
    }

    const body = await req.json();
    const {
      entry_type, entry_date, payment_mode, customer_type,
      party_name, party_gstin, invoice_number, remarks,
      line_items,
    } = body;

    // Validate new data
    const businessGstin = await getBusinessGstin(token!);
    const validation = line_items ? await validateEntry(
      {
        entry_type, entry_date, payment_mode, customer_type,
        party_name, party_gstin, invoice_number,
        business_gstin: businessGstin,
        line_items: line_items as LineItemInput[],
      },
      { isUpdate: true, entryId: id },
    ) : null;

    // Build update diffs for audit
    const parentUpdates: Record<string, any> = {};
    if (entry_type !== undefined) parentUpdates.entry_type = entry_type;
    if (entry_date !== undefined) parentUpdates.entry_date = entry_date;
    if (payment_mode !== undefined) parentUpdates.payment_mode = payment_mode;
    if (customer_type !== undefined) parentUpdates.customer_type = customer_type;
    if (party_name !== undefined) parentUpdates.party_name = party_name || null;
    if (party_gstin !== undefined) parentUpdates.party_gstin = party_gstin || null;
    if (invoice_number !== undefined) parentUpdates.invoice_number = invoice_number || null;
    if (remarks !== undefined) parentUpdates.remarks = remarks || null;
    parentUpdates.updated_at = new Date().toISOString();

    // Compute audit diffs
    const diffs = writeAuditLog(existing, parentUpdates, body);

    // Update parent entry
    const { data: updatedEntry, error: updateError } = await supabaseServer
      .from("entries")
      .update(parentUpdates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Append diffs to JSONB audit_log
    if (diffs.length > 0) {
      const newAuditEntry = diffs.map(d => ({
        ...d,
        changed_at: new Date().toISOString(),
        changed_by: session.id,
      }));
      const newAuditLog = [...(existing.audit_log || []), ...newAuditEntry];
      await supabaseServer
        .from("entries")
        .update({ audit_log: newAuditLog })
        .eq("id", id);

      // Also write to audit_logs table
      for (const d of diffs) {
        await supabaseServer.from("audit_logs").insert({
          trial_id: session.id,
          entity_type: 'ENTRY',
          entity_id: id,
          action: 'UPDATE',
          field_name: d.field,
          old_value: d.old_value,
          new_value: d.new_value,
          user_agent: req.headers.get("user-agent") || null,
        });
      }
    }

    // If line items provided, replace them
    if (validation && validation.valid && validation.validatedLineItems.length > 0) {
      // Soft delete old line items
      await supabaseServer
        .from("entry_line_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("entry_id", id)
        .is("deleted_at", null);

      // Insert new line items
      const newItems = validation.validatedLineItems.map(li => ({
        entry_id: id,
        product_id: li.product_id || null,
        product_name: li.product_name,
        hsn_code: li.hsn_code || null,
        quantity: li.quantity,
        unit: li.unit || 'pcs',
        amount_paise: li.amount_paise,
        rate_paise: li.rate_paise,
        taxable_paise: li.taxable_paise,
        gst_rate: li.gst_rate,
        cgst_paise: li.cgst_paise,
        sgst_paise: li.sgst_paise,
        igst_paise: li.igst_paise,
        total_gst_paise: li.total_gst_paise,
        total_paise: li.total_paise,
        itc_status: li.itc_status,
        itc_amount_paise: li.itc_amount_paise,
        block_reason: li.block_reason,
        is_price_sensitive: li.is_price_sensitive || false,
        threshold_paise: li.threshold_paise || 100000,
      }));

      await supabaseServer.from("entry_line_items").insert(newItems);
    }

    // Fetch final state with line items
    const { data: finalEntry } = await supabaseServer
      .from("entries")
      .select("*, entry_line_items(*)")
      .eq("id", id)
      .single();

    if (finalEntry) {
      finalEntry.entry_line_items = (finalEntry.entry_line_items || []).filter((li: any) => !li.deleted_at);
    }

    return NextResponse.json({
      success: true,
      data: finalEntry,
      warnings: validation?.warnings || [],
    });
  } catch (err) {
    console.error("Entry update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: existing } = await supabaseServer
      .from("entries")
      .select("id, period_locked")
      .eq("id", id)
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .single();

    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    if (existing.period_locked) {
      return NextResponse.json({
        error: "Cannot delete — this period has been filed",
        code: "PERIOD_LOCKED",
      }, { status: 423 });
    }

    const now = new Date().toISOString();

    // Soft delete line items
    await supabaseServer
      .from("entry_line_items")
      .update({ deleted_at: now })
      .eq("entry_id", id)
      .is("deleted_at", null);

    // Soft delete entry
    const { error } = await supabaseServer
      .from("entries")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log
    await supabaseServer.from("audit_logs").insert({
      trial_id: session.id,
      entity_type: 'ENTRY',
      entity_id: id,
      action: 'DELETE',
      user_agent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Entry delete error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
