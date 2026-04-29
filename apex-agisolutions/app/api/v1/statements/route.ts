import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { verifyUserSession, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/v1/statements
 * List all statements for the current user session
 */
export async function GET(req: NextRequest) {
  const auth = await verifyUserSession(req);
  if (!auth.authenticated) {
    return authErrorResponse(auth);
  }

  try {
    const { data: statements, error } = await supabaseServer
      .from("statements")
      .select("id, filename, bank_name, status, error_message, created_at, updated_at")
      .eq("trial_id", auth.trialId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch statements error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get transaction counts for each completed statement
    const statementsWithCounts = await Promise.all(
      (statements || []).map(async (statement) => {
        let transactionCount = 0;
        if (statement.status === "COMPLETED") {
          const { count } = await supabaseServer
            .from("transactions")
            .select("id", { count: "exact" })
            .eq("statement_id", statement.id);
          transactionCount = count || 0;
        }
        return {
          ...statement,
          transactionCount,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: statementsWithCounts,
    });
  } catch (err) {
    console.error("Statements list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
