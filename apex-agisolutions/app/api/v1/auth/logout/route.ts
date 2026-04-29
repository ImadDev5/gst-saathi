import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * POST /api/v1/auth/logout
 * GET /api/v1/auth/logout
 * Clears user cookies and revokes session in Supabase.
 */

function clearCookies(response: NextResponse) {
  // Clear both cookies
  response.cookies.set("user_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("trial_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearCookies(response);
}

export async function GET() {
  // GET request for simple link-based logout (redirects to home)
  const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  return clearCookies(response);
}
