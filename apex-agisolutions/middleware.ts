import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Role-based access control middleware with Supabase session storage
 * -------------------------------------------------------------------
 * Stack: Next.js App Router (Edge Middleware)
 *
 * Session cookies:
 *   - user_session / trial_token  → User role (access to /dashboard, /retail)
 *   - admin_session              → Admin role (access to /admin)
 *
 * Rules:
 *   1. Admins can NEVER access user-only routes (/dashboard, /retail).
 *   2. Users can NEVER access admin routes (/admin).
 *   3. Unauthenticated visitors are redirected to safe landing pages.
 *   4. The /admin/signin page remains public so admins can log in.
 *   5. Role is verified against Supabase on every protected request.
 */

const USER_ROUTES = ["/dashboard", "/retail"];
const ADMIN_ROUTES = ["/admin"];

function isUserRoute(path: string): boolean {
  return USER_ROUTES.some((prefix) => path.startsWith(prefix));
}

function isAdminRoute(path: string): boolean {
  return ADMIN_ROUTES.some((prefix) => path.startsWith(prefix));
}

async function getSessionRole(
  request: NextRequest,
): Promise<{ role: string | null; isAdmin: boolean; isUser: boolean }> {
  const userToken = request.cookies.get("user_session")?.value;
  const trialToken = request.cookies.get("trial_token")?.value;
  const adminToken = request.cookies.get("admin_session")?.value;

  // Initialize Supabase client for Edge
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    },
  );

  // Check admin session first
  if (adminToken) {
    const { data: adminSession } = await supabase
      .from("admin_sessions")
      .select("role, status, expires_at")
      .eq("token", adminToken)
      .single();

    if (
      adminSession &&
      adminSession.status === "ACTIVE" &&
      new Date(adminSession.expires_at) >= new Date()
    ) {
      return { role: adminSession.role, isAdmin: true, isUser: false };
    }
  }

  // Check user session (new user_sessions table)
  const userSessionToken = userToken || trialToken;
  if (userSessionToken) {
    // Try user_sessions first
    const { data: userSession } = await supabase
      .from("user_sessions")
      .select("role, status, expires_at")
      .eq("token", userSessionToken)
      .single();

    if (
      userSession &&
      userSession.status === "ACTIVE" &&
      new Date(userSession.expires_at) >= new Date()
    ) {
      return { role: userSession.role, isAdmin: false, isUser: true };
    }

    // Fallback to trial_sessions (legacy)
    const { data: trialSession } = await supabase
      .from("trial_sessions")
      .select("status, expires_at")
      .eq("token", userSessionToken)
      .single();

    if (
      trialSession &&
      trialSession.status === "ACTIVE" &&
      new Date(trialSession.expires_at) >= new Date()
    ) {
      return { role: "USER", isAdmin: false, isUser: true };
    }
  }

  return { role: null, isAdmin: false, isUser: false };
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Admin sign-in page is always accessible
  if (path === "/admin/signin") {
    const { isAdmin } = await getSessionRole(request);
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // User sign-in page: redirect already-authenticated users to their dashboard
  if (path === "/signin") {
    const { isAdmin, isUser } = await getSessionRole(request);
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    if (isUser) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const { isAdmin, isUser } = await getSessionRole(request);

  // Admin routes: only admins allowed
  if (isAdminRoute(path)) {
    // Users trying to access admin → redirect to their own dashboard with a message
    if (isUser && !isAdmin) {
      return NextResponse.redirect(
        new URL("/dashboard?error=admin_only", request.url),
      );
    }
    // Unauthenticated → admin sign-in
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/admin/signin", request.url));
    }
    return NextResponse.next();
  }

  // User routes: only trial_token users allowed
  if (isUserRoute(path)) {
    // Admins trying to access user routes → redirect to admin dashboard with a message
    if (isAdmin && !isUser) {
      return NextResponse.redirect(
        new URL("/admin?error=user_only", request.url),
      );
    }
    // Unauthenticated → home page
    if (!isUser) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/retail/:path*", "/admin/:path*", "/signin"],
};
