import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * Shared server-side authorization helpers for Next.js Route Handlers.
 *
 * Assumptions:
 *   - Next.js App Router with Route Handlers (app/api/.../route.ts)
 *   - Supabase PostgreSQL database
 *   - Cookie-based sessions:
 *       trial_token    → legacy user session (trial_sessions table)
 *       user_session   → new role-based user session (user_sessions table)
 *       admin_session  → admin session (admin_sessions table)
 *
 * Role model:
 *   - USER: can access /dashboard, /retail (user routes)
 *   - EMPLOYEE: can access /dashboard, /retail (user routes)
 *   - CA_VIEWER: can access /dashboard (read-only, user routes)
 *   - OWNER: can access /dashboard, /retail (user routes)
 *   - ADMIN: can access /admin/* (admin routes)
 *   - SUPER_ADMIN: can access /admin/* (admin routes)
 */

export type UserRole = "USER" | "EMPLOYEE" | "CA_VIEWER" | "OWNER";
export type AdminRole = "ADMIN" | "SUPER_ADMIN";
export type Role = UserRole | AdminRole;

export type AuthResult =
  | { authenticated: true; role: Role; sessionId: string; token: string; trialId: string }
  | { authenticated: false; error: string; status: number };

/**
 * Verify that the request carries a valid USER session (user_session or trial_token cookie).
 * Checks the new user_sessions table first, falls back to trial_sessions for backward compatibility.
 */
export async function verifyUserSession(req: NextRequest): Promise<AuthResult> {
  // Try new user_session cookie first
  const userToken = req.cookies.get("user_session")?.value;
  const trialToken = req.cookies.get("trial_token")?.value;
  const token = userToken || trialToken;

  if (!token) {
    return { authenticated: false, error: "Unauthorized", status: 401 };
  }

  // Try user_sessions table first (new role-based system)
  const { data: userSession, error: userError } = await supabaseServer
    .from("user_sessions")
    .select("id, role, status, expires_at, trial_session_id")
    .eq("token", token)
    .single();

  if (userSession && !userError) {
    if (userSession.status !== "ACTIVE") {
      return { authenticated: false, error: "Session deactivated", status: 403 };
    }
    if (new Date(userSession.expires_at) < new Date()) {
      return { authenticated: false, error: "Session expired", status: 403 };
    }
    // Use trial_session_id for data lookups if available, otherwise fallback to user_sessions.id
    const trialId = userSession.trial_session_id || userSession.id;
    return {
      authenticated: true,
      role: userSession.role as UserRole,
      sessionId: userSession.id,
      token,
      trialId,
    };
  }

  // Fallback to trial_sessions (legacy system)
  const { data: trialSession, error: trialError } = await supabaseServer
    .from("trial_sessions")
    .select("id, status, expires_at")
    .eq("token", token)
    .single();

  if (trialError || !trialSession) {
    return { authenticated: false, error: "Invalid or expired session", status: 401 };
  }

  if (trialSession.status !== "ACTIVE") {
    return { authenticated: false, error: "Session deactivated", status: 403 };
  }

  if (new Date(trialSession.expires_at) < new Date()) {
    return { authenticated: false, error: "Session expired", status: 403 };
  }

  // Legacy session defaults to USER role
  return {
    authenticated: true,
    role: "USER" as UserRole,
    sessionId: trialSession.id,
    token,
    trialId: trialSession.id,
  };
}

/**
 * Verify that the request carries a valid ADMIN session (admin_session cookie).
 */
export async function verifyAdminSession(req: NextRequest): Promise<AuthResult> {
  const token = req.cookies.get("admin_session")?.value;

  if (!token) {
    return { authenticated: false, error: "Unauthorized", status: 401 };
  }

  const { data: session, error } = await supabaseServer
    .from("admin_sessions")
    .select("id, role, status, expires_at")
    .eq("token", token)
    .single();

  if (error || !session) {
    return { authenticated: false, error: "Invalid or expired admin session", status: 401 };
  }

  if (session.status !== "ACTIVE") {
    return { authenticated: false, error: "Admin session deactivated", status: 403 };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { authenticated: false, error: "Admin session expired", status: 403 };
  }

  return {
    authenticated: true,
    role: session.role as AdminRole,
    sessionId: session.id,
    token,
    trialId: session.id,
  };
}

/**
 * Verify any session and return role information.
 * Useful for middleware that needs to know the role without redirecting.
 */
export async function verifyAnySession(req: NextRequest): Promise<AuthResult> {
  // Try admin first
  const adminResult = await verifyAdminSession(req);
  if (adminResult.authenticated) return adminResult;

  // Then try user
  const userResult = await verifyUserSession(req);
  if (userResult.authenticated) return userResult;

  return { authenticated: false, error: "Unauthorized", status: 401 };
}

/**
 * Return a standardized JSON error response for use inside Route Handlers.
 */
export function authErrorResponse(result: Extract<AuthResult, { authenticated: false }>) {
  return Response.json({ success: false, error: result.error }, { status: result.status });
}

/**
 * Check if a role is an admin role.
 */
export function isAdminRole(role: Role): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Check if a role is a user role (non-admin).
 */
export function isUserRole(role: Role): boolean {
  return ["USER", "EMPLOYEE", "CA_VIEWER", "OWNER"].includes(role);
}
