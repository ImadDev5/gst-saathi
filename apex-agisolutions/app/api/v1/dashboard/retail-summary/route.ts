import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET /api/v1/dashboard/retail-summary
 * Returns today + MTD metrics for Module B
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

    // Today's entries
    const { data: todayEntries } = await supabaseServer
      .from("retail_entries")
      .select("entry_type, total_paise, cgst_paise, sgst_paise, igst_paise, taxable_paise")
      .eq("trial_id", session.id)
      .eq("entry_date", today)
      .is("deleted_at", null);

    // MTD entries
    const { data: mtdEntries } = await supabaseServer
      .from("retail_entries")
      .select("entry_type, total_paise, cgst_paise, sgst_paise, igst_paise, taxable_paise, itc_eligible")
      .eq("trial_id", session.id)
      .gte("entry_date", monthStart)
      .lte("entry_date", today)
      .is("deleted_at", null);

    const calc = (entries: typeof todayEntries, types: string[]) => {
      return (entries || [])
        .filter((e: { entry_type: string }) => types.includes(e.entry_type))
        .reduce((sum: number, e: { total_paise: number }) => sum + e.total_paise, 0);
    };

    const calcGst = (entries: typeof todayEntries, types: string[]) => {
      return (entries || [])
        .filter((e: { entry_type: string }) => types.includes(e.entry_type))
        .reduce((sum: number, e: { cgst_paise: number; sgst_paise: number; igst_paise: number }) =>
          sum + e.cgst_paise + e.sgst_paise + e.igst_paise, 0);
    };

    const todaySalesPaise = calc(todayEntries, ["SALE"]);
    const todayGstPaise = calcGst(todayEntries, ["SALE"]);
    const todayPurchasesPaise = calc(todayEntries, ["PURCHASE"]);
    const todayItcPaise = calcGst(todayEntries, ["PURCHASE"]);
    const mtdSalesPaise = calc(mtdEntries, ["SALE"]);
    const mtdItcPaise = calcGst(mtdEntries, ["PURCHASE"]);
    const mtdGstCollected = calcGst(mtdEntries, ["SALE"]);
    const mtdGstPayablePaise = Math.max(0, mtdGstCollected - mtdItcPaise);

    return NextResponse.json({
      success: true,
      data: {
        todaySalesPaise,
        todayGstPaise,
        todayPurchasesPaise,
        todayItcPaise,
        mtdSalesPaise,
        mtdItcPaise,
        mtdGstPayablePaise,
      },
    });
  } catch (err) {
    console.error("Retail summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
