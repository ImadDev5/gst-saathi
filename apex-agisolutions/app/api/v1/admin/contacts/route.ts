import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { verifyAdminSession, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/v1/admin/contacts
 * PATCH /api/v1/admin/contacts
 *
 * Admin-only endpoints. Any non-admin request receives 401/403.
 */

export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authenticated) {
    return authErrorResponse(auth);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "20", 10);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const status = searchParams.get("status") || "";

  const offset = (page - 1) * perPage;

  // Build query with filters
  let query = supabaseServer.from("contacts").select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,business_name.ilike.%${search}%,gstin.ilike.%${search}%`,
    );
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    console.error("Fetch contacts error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get stats
  const { data: allData } = await supabaseServer
    .from("contacts")
    .select("id, assigned_token, status", { count: "exact" });

  const totalContacts = allData?.length || 0;
  const assignedCount =
    allData?.filter((c) => c.assigned_token).length || 0;
  const newCount =
    allData?.filter((c) => c.status === "NEW").length || 0;

  return NextResponse.json({
    success: true,
    data: data || [],
    meta: {
      page,
      perPage,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / perPage),
      assigned: assignedCount,
      new: newCount,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (!auth.authenticated) {
    return authErrorResponse(auth);
  }

  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json(
      { error: "id and status required" },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from("contacts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Update contact error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
