import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { calculateGST } from "@/lib/engine/gst-calculator";

/**
 * POST /api/v1/entries — Create a new retail entry (sale/purchase)
 * GET  /api/v1/entries — List entries with filters
 */

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const {
      entry_type, entry_date, payment_mode, customer_type = "B2C",
      party_name, party_gstin, invoice_number,
      product_id, product_name, hsn_code,
      quantity = 1, unit = "pcs", rate_paise, gst_rate,
      is_price_sensitive = false, threshold_paise = 100000,
      remarks,
    } = body;

    // Validate required fields
    if (!entry_type || !entry_date || !payment_mode || !product_name || !rate_paise || gst_rate === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate entry_date not in locked period
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
        code: "PERIOD_LOCKED"
      }, { status: 409 });
    }

    // Determine inter-state based on GSTIN state codes
    let isInterState = false;
    if (party_gstin && party_gstin.length >= 2) {
      const { data: businessContact } = await supabaseServer
        .from("contacts")
        .select("gstin")
        .eq("assigned_token", token)
        .maybeSingle();

      const businessGstin = (businessContact as any)?.gstin;
      if (businessGstin && businessGstin.length >= 2) {
        const businessState = businessGstin.substring(0, 2);
        const partyState = party_gstin.substring(0, 2);
        isInterState = businessState !== partyState;
      }
    }

    // Calculate GST
    const gstBreakdown = calculateGST(
      quantity, rate_paise, gst_rate, isInterState, is_price_sensitive, threshold_paise
    );

    // Insert entry
    const { data: entry, error: insertError } = await supabaseServer
      .from("retail_entries")
      .insert({
        trial_id: session.id,
        entry_type,
        entry_date,
        payment_mode,
        customer_type,
        party_name: party_name || null,
        party_gstin: party_gstin || null,
        invoice_number: invoice_number || null,
        product_id: product_id || null,
        product_name,
        hsn_code: hsn_code || null,
        quantity,
        unit,
        rate_paise,
        taxable_paise: gstBreakdown.taxablePaise,
        gst_rate: gstBreakdown.gstRate,
        cgst_paise: gstBreakdown.cgstPaise,
        sgst_paise: gstBreakdown.sgstPaise,
        igst_paise: gstBreakdown.igstPaise,
        total_paise: gstBreakdown.totalPaise,
        itc_eligible: entry_type === "PURCHASE" || entry_type === "PURCHASE_RETURN",
        remarks: remarks || null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: entry,
      thresholdWarning: gstBreakdown.thresholdWarning,
    }, { status: 201 });
  } catch (err) {
    console.error("Entry create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const url = new URL(req.url);
    const entryType = url.searchParams.get("type");
    const period = url.searchParams.get("period"); // YYYY-MM
    const paymentMode = url.searchParams.get("payment_mode");
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(url.searchParams.get("per_page") || "50"), 100);
    const offset = (page - 1) * perPage;

    let query = supabaseServer
      .from("retail_entries")
      .select("*", { count: "exact" })
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .order("entry_date", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (entryType) query = query.eq("entry_type", entryType);
    if (paymentMode) query = query.eq("payment_mode", paymentMode);
    if (period) {
      const [year, month] = period.split("-").map(Number);
      const start = new Date(year, month - 1, 1).toISOString().split("T")[0];
      const end = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("entry_date", start).lte("entry_date", end);
    }

    const { data, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: { page, perPage, total: count || 0 },
    });
  } catch (err) {
    console.error("Entry list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
