import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET /api/v1/dashboard/retail-summary
 * Returns today + MTD metrics with rate-slab breakdown and ITC status breakdown
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const today = new Date().toISOString().split("T")[0];
    const monthStart = today.substring(0, 7) + "-01";

    // Fetch entries for today and MTD with line items
    const { data: todayEntries } = await supabaseServer
      .from("entries")
      .select("entry_type, entry_line_items(entry_id, total_paise, total_gst_paise, cgst_paise, sgst_paise, igst_paise, taxable_paise, gst_rate, itc_status, itc_amount_paise, block_reason)")
      .eq("trial_id", session.id)
      .eq("entry_date", today)
      .is("deleted_at", null);

    const { data: mtdEntries } = await supabaseServer
      .from("entries")
      .select("entry_type, entry_line_items(entry_id, total_paise, total_gst_paise, cgst_paise, sgst_paise, igst_paise, taxable_paise, gst_rate, itc_status, itc_amount_paise, block_reason)")
      .eq("trial_id", session.id)
      .gte("entry_date", monthStart)
      .lte("entry_date", today)
      .is("deleted_at", null);

    // Helper: filter active line items (exclude soft-deleted)
    const activeLi = (e: any) => (e.entry_line_items || []).filter((li: any) => !li.deleted_at);

    // Helper: sum a field from line items of filtered entries
    const sumLi = (entries: any[] | null, types: string[], field: string) => {
      if (!entries) return 0;
      return entries
        .filter((e: any) => types.includes(e.entry_type))
        .reduce((sum: number, e: any) => {
          return sum + activeLi(e).reduce(
            (s: number, li: any) => s + (li[field] || 0), 0
          );
        }, 0);
    };

    // Helper: sum by GST rate slab
    const sumBySlab = (entries: any[] | null, types: string[], field: string) => {
      if (!entries) return {};
      const bySlab: Record<number, number> = {};
      entries
        .filter((e: any) => types.includes(e.entry_type))
        .forEach((e: any) => {
          activeLi(e).forEach((li: any) => {
            const rate = li.gst_rate || 0;
            bySlab[rate] = (bySlab[rate] || 0) + (li[field] || 0);
          });
        });
      return bySlab;
    };

    // Helper: sum by ITC status
    const sumByItcStatus = (entries: any[] | null) => {
      if (!entries) return {};
      const byStatus: Record<string, number> = {};
      entries
        .filter((e: any) => ['PURCHASE', 'PURCHASE_RETURN'].includes(e.entry_type))
        .forEach((e: any) => {
          activeLi(e).forEach((li: any) => {
            const status = li.itc_status || 'UNKNOWN';
            byStatus[status] = (byStatus[status] || 0) + (li.itc_amount_paise || 0);
          });
        });
      return byStatus;
    };

    // Today calculations
    const todaySales = sumLi(todayEntries, ['SALE'], 'total_paise');
    const todayGstCollected = sumLi(todayEntries, ['SALE'], 'total_gst_paise');
    const todayPurchases = sumLi(todayEntries, ['PURCHASE'], 'total_paise');
    const todayItcEarned = sumLi(todayEntries, ['PURCHASE'], 'itc_amount_paise');
    const todayNetPosition = todayGstCollected - todayItcEarned;

    // MTD calculations
    const mtdSales = sumLi(mtdEntries, ['SALE'], 'total_paise');
    const mtdGstCollected = sumLi(mtdEntries, ['SALE'], 'total_gst_paise');
    const mtdPurchases = sumLi(mtdEntries, ['PURCHASE'], 'total_paise');
    const mtdItcEarned = sumLi(mtdEntries, ['PURCHASE'], 'itc_amount_paise');
    const mtdNetPosition = mtdGstCollected - mtdItcEarned;

    // Rate slab breakdown
    const salesByRate = sumBySlab(mtdEntries, ['SALE'], 'total_gst_paise');
    const itcByStatus = sumByItcStatus(mtdEntries);

    // Entry counts
    const todayEntryCount = (todayEntries || []).length;
    const mtdEntryCount = (mtdEntries || []).length;

    return NextResponse.json({
      success: true,
      data: {
        today: {
          entry_count: todayEntryCount,
          sales_paise: todaySales,
          gst_collected_paise: todayGstCollected,
          purchases_paise: todayPurchases,
          itc_earned_paise: todayItcEarned,
          net_position_paise: todayNetPosition,
        },
        mtd: {
          entry_count: mtdEntryCount,
          sales_paise: mtdSales,
          gst_collected_paise: mtdGstCollected,
          purchases_paise: mtdPurchases,
          itc_earned_paise: mtdItcEarned,
          net_position_paise: mtdNetPosition,
        },
        sales_by_rate_slab: salesByRate,
        itc_by_status: itcByStatus,
      },
    });
  } catch (err) {
    console.error("Retail summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
