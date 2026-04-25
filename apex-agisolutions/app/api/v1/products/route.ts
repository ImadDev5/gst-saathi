import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET  /api/v1/products — List products for session
 * POST /api/v1/products — Create new product
 */

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const url = new URL(req.url);
    const search = url.searchParams.get("q");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

    let query = supabaseServer
      .from("products")
      .select("*")
      .eq("is_active", true)
      .or(`trial_id.eq.${session.id},is_preloaded.eq.true`)
      .order("product_name")
      .limit(limit);

    if (search) {
      query = query.ilike("product_name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error("Products list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("trial_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: session } = await supabaseServer
      .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const body = await req.json();
    const {
      product_name, hsn_sac_code, default_gst_rate = 18,
      unit = "pcs", default_sale_rate, default_purchase_rate,
      is_price_sensitive = false, threshold_paise = 100000, category,
    } = body;

    if (!product_name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const { data: product, error } = await supabaseServer
      .from("products")
      .insert({
        trial_id: session.id,
        product_name,
        hsn_sac_code: hsn_sac_code || null,
        default_gst_rate,
        unit,
        default_sale_rate: default_sale_rate || null,
        default_purchase_rate: default_purchase_rate || null,
        is_price_sensitive,
        threshold_paise,
        category: category || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err) {
    console.error("Product create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
