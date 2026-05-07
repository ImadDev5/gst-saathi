import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function getSessionInfo() {
  const cookieStore = await cookies();
  const userToken =
    cookieStore.get("user_session")?.value ||
    cookieStore.get("trial_token")?.value;
  const adminToken = cookieStore.get("admin_session")?.value;

  if (adminToken) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: session } = await supabase
      .from("admin_sessions")
      .select("id, role, status, expires_at")
      .eq("token", adminToken)
      .single();

    if (
      session &&
      session.status === "ACTIVE" &&
      new Date(session.expires_at) >= new Date()
    ) {
      return {
        isAdmin: true,
        role: session.role as string,
        trialToken: null,
        adminToken,
      };
    }
  }

  if (userToken) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: userSession } = await supabase
      .from("user_sessions")
      .select("id, role, status, expires_at")
      .eq("token", userToken)
      .single();

    if (
      userSession &&
      userSession.status === "ACTIVE" &&
      new Date(userSession.expires_at) >= new Date()
    ) {
      return {
        isAdmin: false,
        role: userSession.role as string,
        trialToken: userToken,
        adminToken: null,
      };
    }

    const { data: trialSession } = await supabase
      .from("trial_sessions")
      .select("id, status, expires_at")
      .eq("token", userToken)
      .single();

    if (
      trialSession &&
      trialSession.status === "ACTIVE" &&
      new Date(trialSession.expires_at) >= new Date()
    ) {
      return {
        isAdmin: false,
        role: "USER",
        trialToken: userToken,
        adminToken: null,
      };
    }
  }

  return null;
}