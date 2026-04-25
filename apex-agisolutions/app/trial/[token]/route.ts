import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing_token", req.url));
  }

  // Verify the token against the trial_sessions table
  const { data: session, error } = await supabaseServer
    .from("trial_sessions")
    .select("id, status")
    .eq("token", token)
    .single();

  if (error || !session) {
    return NextResponse.redirect(new URL("/?error=invalid_token", req.url));
  }

  if (session.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/?error=expired_token", req.url));
  }

  // Token is valid, set standard Next.js cookie
  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  
  // Set cookie valid for 7 days
  response.cookies.set("trial_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, 
  });

  return response;
}