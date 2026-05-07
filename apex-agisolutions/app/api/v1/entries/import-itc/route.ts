import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { transactionsToEntryPayload } from "@/lib/engine/itc-to-gstr-bridge";

/**
 * POST /api/v1/entries/import-itc
 *
 * Imports ELIGIBLE ITC transactions from Module A (bank statements)
 * into Module B as purchase entries, ready for GSTR-3B computation.
 *
 * Body: { period?: "YYYY-MM", entryDate?: "YYYY-MM-DD" }
 */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions")
      .select("id")
      .eq("token", token)
      .eq("status", "ACTIVE")
      .single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const period = body.period;
    const entryDate = body.entryDate || new Date().toISOString().split("T")[0];

    // Determine date range: if period is given, use it; otherwise use current month
    let start: string;
    let end: string;

    if (period) {
      const [year, month] = period.split("-").map(Number);
      start = new Date(year, month - 1, 1).toISOString().split("T")[0];
      end = new Date(year, month, 0).toISOString().split("T")[0];
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    }

    // Fetch ELIGIBLE ITC transactions from bank statements
    const { data: transactions, error: txnError } = await supabaseServer
      .from("transactions")
      .select("id, transaction_date, description, amount, gst_amount, itc_status, mapped_vendor_name, block_reason, transaction_type, statement_id")
      .eq("trial_id", session.id)
      .eq("itc_status", "ELIGIBLE")
      .gt("gst_amount", 0)
      .gte("transaction_date", start)
      .lte("transaction_date", end);

    if (txnError) return NextResponse.json({ error: txnError.message }, { status: 500 });

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No eligible ITC transactions found for this period",
        imported: 0,
      }, { status: 404 });
    }

    // Convert to entry payload
    const payload = transactionsToEntryPayload(transactions, entryDate);

    // Create parent entry
    const { data: entry, error: entryError } = await supabaseServer
      .from("entries")
      .insert({
        trial_id: session.id,
        entry_type: payload.entry_type,
        entry_date: payload.entry_date,
        payment_mode: payload.payment_mode,
        customer_type: payload.customer_type,
        party_name: payload.party_name,
        party_gstin: payload.party_gstin,
        invoice_number: payload.invoice_number,
        has_invoice: false,
        period_locked: false,
      })
      .select()
      .single();

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 });
    }

    // Insert line items (batch)
    const lineItemsToInsert = payload.line_items.map((li) => ({
      entry_id: entry.id,
      product_name: li.product_name,
      hsn_code: li.hsn_code,
      quantity: li.quantity,
      unit: li.unit,
      amount_paise: li.total_paise,
      rate_paise: li.taxable_paise,
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
    }));

    const { error: itemsError } = await supabaseServer
      .from("entry_line_items")
      .insert(lineItemsToInsert);

    if (itemsError) {
      await supabaseServer.from("entries").delete().eq("id", entry.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Insert audit log
    await supabaseServer.from("audit_logs").insert({
      trial_id: session.id,
      entity_type: "ENTRY",
      entity_id: entry.id,
      action: "ITC_IMPORT",
      new_value: JSON.stringify({
        source: "bank_statement",
        transaction_count: transactions.length,
        period: period || `${start} to ${end}`,
      }),
    });

    const totalItcPaise = payload.line_items.reduce((sum, li) => sum + li.itc_amount_paise, 0);

    return NextResponse.json({
      success: true,
      data: {
        entry,
        importedCount: transactions.length,
        totalItcPaise,
        summary: `Imported ${transactions.length} ITC-eligible transactions with ₹${(totalItcPaise / 100).toLocaleString("en-IN")} ITC`,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Import ITC error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
