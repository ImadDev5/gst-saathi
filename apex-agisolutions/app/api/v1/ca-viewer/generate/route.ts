import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { verifyUserSession, authErrorResponse } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyUserSession(req);
    if (!auth.authenticated) {
      return authErrorResponse(auth);
    }

    const caToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: insertError } = await supabaseServer
      .from("ca_shares")
      .insert({
        parent_trial_id: auth.trialId,
        ca_token: caToken,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("ca_shares insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to generate CA link" },
        { status: 500 },
      );
    }

    const shareableUrl = `${req.nextUrl.origin}/ca-view/${caToken}`;

    return NextResponse.json({
      success: true,
      url: shareableUrl,
      expires_in: "7 days",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
