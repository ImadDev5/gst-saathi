import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { validateEntry } from "@/lib/engine/entry-validator";
import type { LineItemInput, DuplicateCheckResult } from "@/lib/engine/entry-validator";

/**
 * POST /api/v1/entries — Create entry with multiple line items
 * GET  /api/v1/entries — List entries with nested line items
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

async function getProductInfo(productIds: string[]): Promise<Map<string, { id: string; name: string; defaultRate: number; category: string | null }>> {
  const map = new Map<string, { id: string; name: string; defaultRate: number; category: string | null }>();
  if (productIds.length === 0) return map;

  const { data } = await supabaseServer
    .from("products")
    .select("id, product_name, default_gst_rate, category, is_price_sensitive, threshold_paise")
    .in("id", productIds);

  if (data) {
    for (const p of data) {
      map.set(p.id, {
        id: p.id,
        name: p.product_name,
        defaultRate: Number(p.default_gst_rate),
        category: p.category || null,
      });
    }
  }
  return map;
}

async function checkDuplicateInvoice(
  trialId: string,
  invoiceNumber: string | null,
  partyGstin: string | null,
): Promise<DuplicateCheckResult> {
  if (!invoiceNumber) return { isDuplicate: false, existingEntryDate: null, existingEntryId: null };

  let query = supabaseServer
    .from("entries")
    .select("id, entry_date")
    .eq("trial_id", trialId)
    .eq("invoice_number", invoiceNumber)
    .is("deleted_at", null)
    .limit(1);

  if (partyGstin) {
    query = query.eq("party_gstin", partyGstin);
  }

  const { data } = await query;
  if (data && data.length > 0) {
    return {
      isDuplicate: true,
      existingEntryDate: data[0].entry_date,
      existingEntryId: data[0].id,
    };
  }
  return { isDuplicate: false, existingEntryDate: null, existingEntryId: null };
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      entry_type, entry_date, payment_mode, customer_type = "B2C",
      party_name, party_gstin, invoice_number, remarks,
      line_items,
    } = body;

    // Quick validation
    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
    }

    // Check period lock
    const entryDate = new Date(entry_date);
    const periodMonth = entryDate.getMonth() + 1;
    const periodYear = entryDate.getFullYear();

    const { data: period } = await supabaseServer
      .from("filing_periods")
      .select("status")
      .eq("trial_id", session.id)
      .eq("period_month", periodMonth)
      .eq("period_year", periodYear)
      .single();

    if (period && period.status === "FILED") {
      return NextResponse.json({
        error: "This period is locked — GSTR-3B already filed",
        code: "PERIOD_LOCKED",
      }, { status: 423 });
    }

    // Fetch business GSTIN and product info for validation
    const businessGstin = await getBusinessGstin(token!);
    const productIds = line_items
      .map((li: any) => li.product_id)
      .filter(Boolean) as string[];
    const productRates = await getProductInfo(productIds);

    // Check duplicate invoice
    const duplicateCheck = await checkDuplicateInvoice(
      session.id, invoice_number, party_gstin,
    );

    // Run business rules engine
    const validation = await validateEntry(
      {
        entry_type, entry_date, payment_mode, customer_type,
        party_name, party_gstin, invoice_number,
        business_gstin: businessGstin,
        line_items: line_items as LineItemInput[],
      },
      { productRates, existingInvoiceCheck: duplicateCheck },
    );

    if (!validation.valid) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.errors,
      }, { status: 400 });
    }

    // Determine if ITC is eligible (at least one line item has itc > 0)
    const hasItc = validation.validatedLineItems.some(
      li => li.itc_amount_paise > 0 && li.itc_status === 'ELIGIBLE'
    );

    // Insert parent entry
    const { data: entry, error: entryError } = await supabaseServer
      .from("entries")
      .insert({
        trial_id: session.id,
        entry_type,
        entry_date,
        payment_mode,
        customer_type,
        party_name: party_name || null,
        party_gstin: party_gstin || null,
        invoice_number: invoice_number || null,
        has_invoice: false,
        period_locked: false,
        remarks: remarks || null,
      })
      .select()
      .single();

    if (entryError) {
      return NextResponse.json({ error: entryError.message }, { status: 500 });
    }

    // Insert all line items
    const lineItemsToInsert = validation.validatedLineItems.map(li => ({
      entry_id: entry.id,
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

    const { data: insertedItems, error: itemsError } = await supabaseServer
      .from("entry_line_items")
      .insert(lineItemsToInsert)
      .select();

    if (itemsError) {
      // Rollback parent entry if line items fail
      await supabaseServer.from("entries").delete().eq("id", entry.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Insert audit log for creation
    await supabaseServer.from("audit_logs").insert({
      trial_id: session.id,
      entity_type: 'ENTRY',
      entity_id: entry.id,
      action: 'CREATE',
      new_value: JSON.stringify({ entry_type, entry_date, payment_mode, line_item_count: validation.validatedLineItems.length }),
      user_agent: req.headers.get("user-agent") || null,
    });

    // Compute totals for response
    const totalPaise = validation.validatedLineItems.reduce((sum, li) => sum + li.total_paise, 0);
    const totalGstPaise = validation.validatedLineItems.reduce((sum, li) => sum + li.total_gst_paise, 0);
    const totalItcPaise = validation.validatedLineItems.reduce((sum, li) => sum + li.itc_amount_paise, 0);

    return NextResponse.json({
      success: true,
      data: {
        entry,
        line_items: insertedItems,
        totals: {
          total_paise: totalPaise,
          total_gst_paise: totalGstPaise,
          total_itc_paise: totalItcPaise,
        },
      },
      warnings: validation.warnings,
      rcm: validation.rcmApplicable ? {
        applicable: true,
        amount_paise: validation.rcmAmountPaise,
        note: 'Pay RCM and claim equivalent ITC in same month',
      } : null,
    }, { status: 201 });
  } catch (err) {
    console.error("Entry create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const entryType = url.searchParams.get("type");
    const period = url.searchParams.get("period"); // YYYY-MM
    const paymentMode = url.searchParams.get("payment_mode");
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "50"), 100);
    const offset = (page - 1) * perPage;

    let query = supabaseServer
      .from("entries")
      .select("*, entry_line_items(*)", { count: "exact" })
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (entryType) query = query.eq("entry_type", entryType);
    if (paymentMode) query = query.eq("payment_mode", paymentMode);
    if (period) {
      const [year, month] = period.split("-").map(Number);
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("entry_date", start).lte("entry_date", end);
    }

    const { data, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Compute totals for each entry
    const enriched = (data || []).map((entry: any) => {
      const items = (entry.entry_line_items || []).filter((li: any) => !li.deleted_at);
      const totalPaise = items.reduce((sum: number, li: any) => sum + (li.total_paise || 0), 0);
      const totalGstPaise = items.reduce((sum: number, li: any) => sum + (li.total_gst_paise || 0), 0);
      const totalItcPaise = items.reduce((sum: number, li: any) => sum + (li.itc_amount_paise || 0), 0);
      const totalTaxable = items.reduce((sum: number, li: any) => sum + (li.taxable_paise || 0), 0);
      return {
        ...entry,
        entry_line_items: items,
        computed: { total_paise: totalPaise, total_gst_paise: totalGstPaise, total_itc_paise: totalItcPaise, total_taxable: totalTaxable },
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      meta: { page, perPage, total: count || 0 },
    });
  } catch (err) {
    console.error("Entry list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
