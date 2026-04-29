import { cookies } from "next/headers";
import Link from "next/link";
import { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import LogoutButton from "./LogoutButton";

async function getSessionInfo() {
  const cookieStore = await cookies();
  const userToken = cookieStore.get("user_session")?.value || cookieStore.get("trial_token")?.value;
  const adminToken = cookieStore.get("admin_session")?.value;

  if (adminToken) {
    // Verify admin session with Supabase
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
    
    if (session && session.status === "ACTIVE" && new Date(session.expires_at) >= new Date()) {
      return { isAdmin: true, role: session.role as string, trialToken: null, adminToken };
    }
  }

  if (userToken) {
    // Verify user session with Supabase (new user_sessions table)
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
    
    if (userSession && userSession.status === "ACTIVE" && new Date(userSession.expires_at) >= new Date()) {
      return { isAdmin: false, role: userSession.role as string, trialToken: userToken, adminToken: null };
    }
    
    // Fallback to legacy trial_sessions
    const { data: trialSession } = await supabase
      .from("trial_sessions")
      .select("id, status, expires_at")
      .eq("token", userToken)
      .single();
    
    if (trialSession && trialSession.status === "ACTIVE" && new Date(trialSession.expires_at) >= new Date()) {
      return { isAdmin: false, role: "USER", trialToken: userToken, adminToken: null };
    }
  }

  return null;
}

export default async function Sidebar({ children }: { children: ReactNode }) {
  const session = await getSessionInfo();
  if (!session) return <>{children}</>;

  if (session.isAdmin) {
    return (
      <div className="flex h-screen">
        <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-800">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-amber-400 font-bold text-lg">GST</span>
              <span className="text-white font-bold text-lg">Admin</span>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            <NavItem href="/admin" icon="📋" label="Contacts" />
          </nav>
          <div className="p-3 border-t border-gray-800 space-y-2">
            <a
              href="/api/v1/admin/logout"
              className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1"
            >
              Sign Out
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-auto bg-void">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-gray-950 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold text-lg">GST</span>
            <span className="text-white font-bold text-lg">User</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/dashboard" icon="🏦" label="Dashboard" />
          <NavItem href="/retail" icon="🧾" label="Ledger" />
          <NavItem href="/itc-check" icon="🔍" label="ITC Checker" />
        </nav>
        <div className="p-3 border-t border-gray-800 space-y-2">
          {session.trialToken && (
            <p className="text-[10px] text-gray-500 truncate px-2" title={session.trialToken}>
              Session: {session.trialToken.slice(0, 8)}...
            </p>
          )}
          <LogoutButton />
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors px-2 py-1"
          >
            ← Back to Home
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-void">{children}</main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
