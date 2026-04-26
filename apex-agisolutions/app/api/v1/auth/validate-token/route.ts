import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const { data: session, error } = await supabaseServer
      .from("trial_sessions")
      .select("id, status, expires_at")
      .eq("token", token)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This access token has been deactivated" },
        { status: 403 }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This access token has expired" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      redirect: "/dashboard",
    });

    response.cookies.set("trial_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    console.error("Token validation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
