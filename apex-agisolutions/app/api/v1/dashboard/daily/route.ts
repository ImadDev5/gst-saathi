import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET /api/v1/dashboard/daily?date=YYYY-MM-DD
 * Returns aggregated totals for a single day with rate-slab breakdown
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    const { data: entries } = await supabaseServer
      .from("entries")
      .select("entry_type, entry_line_items(total_paise, taxable_paise, total_gst_paise, cgst_paise, sgst_paise, igst_paise, gst_rate, itc_status, itc_amount_paise)")
      .eq("trial_id", session.id)
      .eq("entry_date", date)
      .is("deleted_at", null);

    if (!entries) {
      return NextResponse.json({ success: true, data: {
        date,
        total_sales_paise: 0,
        gst_collected_paise: 0,
        gst_collected_by_rate: {},
        total_purchases_paise: 0,
        itc_earned_paise: 0,
        itc_breakdown: {},
        net_gst_position_paise: 0,
        entry_count: 0,
      }});
    }

    const sumLi = (entries: any[], types: string[], field: string) =>
      entries
        .filter((e: any) => types.includes(e.entry_type))
        .reduce((s: number, e: any) =>
          s + (e.entry_line_items || []).reduce((a: number, li: any) => a + (li[field] || 0), 0), 0);

    const sumByRate = (entries: any[], types: string[], field: string) => {
      const map: Record<number, number> = {};
      entries
        .filter((e: any) => types.includes(e.entry_type))
        .forEach((e: any) => {
          (e.entry_line_items || []).forEach((li: any) => {
            const r = li.gst_rate || 0;
            map[r] = (map[r] || 0) + (li[field] || 0);
          });
        });
      return map;
    };

    const sumByItc = (entries: any[]) => {
      const map: Record<string, number> = {};
      entries
        .filter((e: any) => ['PURCHASE', 'PURCHASE_RETURN'].includes(e.entry_type))
        .forEach((e: any) => {
          (e.entry_line_items || []).forEach((li: any) => {
            const s = li.itc_status || 'UNKNOWN';
            map[s] = (map[s] || 0) + (li.itc_amount_paise || 0);
          });
        });
      return map;
    };

    const sales = sumLi(entries, ['SALE'], 'total_paise');
    const gstCollected = sumLi(entries, ['SALE'], 'total_gst_paise');
    const purchases = sumLi(entries, ['PURCHASE'], 'total_paise');
    const itcEarned = sumLi(entries, ['PURCHASE'], 'itc_amount_paise');
    const gstByRate = sumByRate(entries, ['SALE'], 'total_gst_paise');
    const itcBreakdown = sumByItc(entries);
    const netPosition = gstCollected - itcEarned;
    const cgst = sumLi(entries, ['SALE'], 'cgst_paise');
    const sgst = sumLi(entries, ['SALE'], 'sgst_paise');
    const igst = sumLi(entries, ['SALE'], 'igst_paise');

    return NextResponse.json({
      success: true,
      data: {
        date,
        total_sales_paise: sales,
        gst_collected_paise: gstCollected,
        gst_collected_by_rate: gstByRate,
        cgst_paise: cgst,
        sgst_paise: sgst,
        igst_paise: igst,
        total_purchases_paise: purchases,
        itc_earned_paise: itcEarned,
        itc_breakdown: itcBreakdown,
        net_gst_position_paise: netPosition,
        entry_count: entries.length,
      },
    });
  } catch (err) {
    console.error("Daily summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
