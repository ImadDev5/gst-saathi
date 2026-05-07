import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { mapGSTR3B } from "@/lib/engine/gstr-mapper";
import { computeITCForGSTR3B } from "@/lib/engine/itc-to-gstr-bridge";

/**
 * GET /api/v1/reports/gstr3b-unified?period=2024-03
 *
 * Merged GSTR-3B that combines Module B (retail entries) outward supplies
 * with Module A (bank statement ITC) inward ITC data.
 */
export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const period = url.searchParams.get("period");
    if (!period) return NextResponse.json({ error: "period query param required (YYYY-MM)" }, { status: 400 });

    const [year, month] = period.split("-").map(Number);
    const start = new Date(year, month - 1, 1).toISOString().split("T")[0];
    const end = new Date(year, month, 0).toISOString().split("T")[0];

    // Fetch Module B: retail entries for outward supplies
    const { data: entries, error: entriesError } = await supabaseServer
      .from("entries")
      .select("id, entry_type, entry_date, customer_type, party_gstin, party_name, entry_line_items(*)")
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .gte("entry_date", start)
      .lte("entry_date", end);

    if (entriesError) return NextResponse.json({ error: entriesError.message }, { status: 500 });

    const filteredEntries = (entries || []).map((e: any) => ({
      ...e,
      entry_line_items: (e.entry_line_items || []).filter((li: any) => !li.deleted_at),
    }));

    const gstr3bFromEntries = mapGSTR3B(filteredEntries);

    // Fetch Module A: ITC-eligible transactions from bank statements for this period
    const { data: transactions, error: txnError } = await supabaseServer
      .from("transactions")
      .select("id, transaction_date, description, amount, gst_amount, itc_status, mapped_vendor_name, block_reason, transaction_type, statement_id")
      .eq("trial_id", session.id)
      .eq("itc_status", "ELIGIBLE")
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: false });

    if (txnError) return NextResponse.json({ error: txnError.message }, { status: 500 });

    const itcSection = computeITCForGSTR3B(transactions || []);

    // Merge Module A ITC into Module B GSTR-3B
    // Add bank statement ITC to the "4_A_5" section (All other ITC)
    const merged4A5 = {
      label: "All other ITC (eligible+available)",
      igstPaise: (gstr3bFromEntries["4_A_5"].igstPaise || 0) + itcSection.igstPaise,
      cgstPaise: (gstr3bFromEntries["4_A_5"].cgstPaise || 0) + itcSection.cgstPaise,
      sgstPaise: (gstr3bFromEntries["4_A_5"].sgstPaise || 0) + itcSection.sgstPaise,
    };

    // Recompute 6.1: Net tax payable with the merged ITC
    const netIgst = (gstr3bFromEntries["3_1_a"].igstPaise || 0) -
      (merged4A5.igstPaise - (gstr3bFromEntries["4_B_2"].igstPaise || 0));
    const netCgst = (gstr3bFromEntries["3_1_a"].cgstPaise || 0) -
      (merged4A5.cgstPaise - (gstr3bFromEntries["4_B_2"].cgstPaise || 0));
    const netSgst = (gstr3bFromEntries["3_1_a"].sgstPaise || 0) -
      (merged4A5.sgstPaise - (gstr3bFromEntries["4_B_2"].sgstPaise || 0));

    const merged = {
      ...gstr3bFromEntries,
      "4_A_5": merged4A5,
      "4_A_bank_itc": {
        label: "ITC from Bank Statements (AI-classified)",
        igstPaise: itcSection.igstPaise,
        cgstPaise: itcSection.cgstPaise,
        sgstPaise: itcSection.sgstPaise,
        eligibleCount: itcSection.eligibleCount,
        totalCount: itcSection.totalCount,
      },
      "6_1": {
        label: "Net tax payable (unified)",
        igstPaise: Math.max(0, netIgst),
        cgstPaise: Math.max(0, netCgst),
        sgstPaise: Math.max(0, netSgst),
        totalPayablePaise: Math.max(0, netIgst) + Math.max(0, netCgst) + Math.max(0, netSgst),
      },
    };

    return NextResponse.json({
      success: true,
      data: merged,
      meta: {
        period,
        moduleA: {
          eligibleCount: itcSection.eligibleCount,
          totalItcPaise: itcSection.totalItcPaise,
          potentialLeakagePaise: itcSection.potentialLeakagePaise,
        },
        moduleB: {
          entryCount: filteredEntries.length,
        },
      },
    });
  } catch (err) {
    console.error("Unified GSTR-3B error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
