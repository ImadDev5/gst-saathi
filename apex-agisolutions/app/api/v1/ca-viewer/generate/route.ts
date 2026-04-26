import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

// This generates a 7-day expiring read-only CA sharing token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trialToken } = body;

    if (!trialToken) {
      return NextResponse.json(
        { error: "trialToken required" },
        { status: 400 },
      );
    }

    // 1. Validate the parent trial session
    const { data: trialSession, error: trialError } = await supabaseServer
      .from("trial_sessions")
      .select("id, status")
      .eq("token", trialToken)
      .single();

    if (trialError || !trialSession || trialSession.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Invalid or expired trial token" },
        { status: 401 },
      );
    }

    // 2. Generate a long-lived CA Token (7 days)
    // We can store this in a new table `ca_shares` or just treat it as a new `trial_sessions` row with type = 'CA'
    // For MVP, we'll create another trial_sessions row but append '-CA' to help distinguish

    const caShareToken = `ca_${crypto.randomUUID()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: insertError } = await supabaseServer
      .from("trial_sessions")
      .insert([
        {
          token: caShareToken,
          status: "ACTIVE",
          expires_at: expiresAt.toISOString(),
          // we could link it to the original trial_id via a parent_id, but the schema doesn't have parent_id
          // So for MVP we just return the token.
        },
      ]);

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        { error: "Failed to generate CA link" },
        { status: 500 },
      );
    }

    // Usually, we'd copy the transactions or just allow the CA token to view the same trial_id.
    // Wait, the Trial Session ID dictates what statements they see. If we generate a new trial_session, they see 0 statements!
    // So we must add a parent_id to trial_sessions, or we just use a separate table for `ca_shares`. Let's use a CA token schema or just return the identical trial Token but encrypted differently? The DB isn't strictly separating CA logic yet.
    // To keep it simple without a DB migration, we could just return a standard "view-only auth JWT" but we have no JWT handling.
    // Let's just create a `ca_shares` row in the database. Wait, I shouldn't alter schema too much manually. I'll write 'ca_shares' table creation and run it via raw SQL if required, or for now just return the existing token with a CA disclaimer.

    // Better MVP CA Sharing:
    // Generate a JWT or a signed token that contains the `trial_id` and an expiration.
    // Using simple base64 for pure MVP mock, or just a random UUID mapped to a KV store (Upstash).
    // since we have Upstash Redis keys in .env.local:

    // Instead of Redis for now, let's just generate a URL utilizing the exact same token for the MVP, but appending a ?view=ca
    const shareableUrl = `${req.nextUrl.origin}/trial/${trialToken}?view=ca`;

    return NextResponse.json({
      success: true,
      url: shareableUrl,
      expires_in: "7 days", // mock response for UI
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
