import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * GET /api/v1/statements/[id]/status
 * Poll statement processing progress
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session } = await supabaseServer
      .from("trial_sessions")
      .select("id")
      .eq("token", token)
      .eq("status", "ACTIVE")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { data: statement, error } = await supabaseServer
      .from("statements")
      .select("id, status, filename, bank_name, error_message, created_at, updated_at")
      .eq("id", id)
      .eq("trial_id", session.id)
      .single();

    if (error || !statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    // If completed, get transaction count
    let transactionCount = 0;
    if (statement.status === "COMPLETED") {
      const { count } = await supabaseServer
        .from("transactions")
        .select("id", { count: "exact" })
        .eq("statement_id", id);
      transactionCount = count || 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...statement,
        transactionCount,
      },
    });
  } catch (err) {
    console.error("Statement status error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
