"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Home,
  Menu,
  X,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

interface SidebarProps {
  children: React.ReactNode;
  isAdmin?: boolean;
  sessionToken?: string | null;
}

const USER_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/retail", icon: BookOpen, label: "Day Book" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/itc-check", icon: PiggyBank, label: "Tax Saver" },
];

const ADMIN_NAV = [
  { href: "/admin", icon: LayoutDashboard, label: "Contacts" },
];

function SidebarInner({
  isAdmin,
  sessionToken,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: {
  isAdmin: boolean;
  sessionToken?: string | null;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const items = isAdmin ? ADMIN_NAV : USER_NAV;

  const navItems = items.map((item) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
          active
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
        {!collapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
      </Link>
    );
  });

  return (
    <>
      <aside
        className="hidden md:flex flex-col h-screen bg-[#0F172A] border-r border-slate-800 shrink-0 transition-[width] duration-150 ease-linear"
        style={{ width: collapsed ? 56 : 240 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 h-14 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-700 shrink-0">
              <span className="font-bold text-sm text-white">TA</span>
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm text-white whitespace-nowrap overflow-hidden tracking-tight">
                Tax<span className="text-slate-400">Apex</span>
              </span>
            )}
          </div>
          {/* VSCode-style toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-7 h-7 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems}
        </nav>

        <div className="px-2 py-3 border-t border-slate-800 space-y-0.5">
          {sessionToken && !collapsed && (
            <p
              className="text-[10px] text-slate-600 truncate px-3"
              title={sessionToken}
            >
              Session: {sessionToken.slice(0, 8)}...
            </p>
          )}
          <div className="px-1">
            <LogoutButton />
          </div>
          {!collapsed && (
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors px-3 py-1.5"
            >
              <Home className="w-3 h-3" />
              Home
            </Link>
          )}
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-slate-700">
            <span className="font-bold text-xs text-white">TA</span>
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">
            Tax<span className="text-slate-400">Apex</span>
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <div
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-[#0F172A] border-r border-slate-800 flex flex-col"
              style={{ animation: "slideIn 150ms ease" }}
            >
              <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-800">
                <div className="flex items-center justify-center w-8 h-8 rounded bg-slate-700">
                  <span className="font-bold text-sm text-white">TA</span>
                </div>
                <span className="font-semibold text-sm text-white tracking-tight">
                  Tax<span className="text-slate-400">Apex</span>
                </span>
              </div>

              <nav className="flex-1 px-3 py-3 space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={active ? 2.5 : 2} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="px-3 py-3 border-t border-slate-800 space-y-1">
                {sessionToken && (
                  <p className="text-[10px] text-slate-600 truncate" title={sessionToken}>
                    Session: {sessionToken.slice(0, 8)}...
                  </p>
                )}
                <LogoutButton />
                <Link
                  href="/"
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <Home className="w-3 h-3" />
                  Home
                </Link>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Sidebar({ children, isAdmin = false, sessionToken }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarInner
        isAdmin={isAdmin}
        sessionToken={sessionToken}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <main className="flex-1 overflow-auto bg-[#F8F9FB] mt-14 md:mt-0">
        {children}
      </main>
    </div>
  );
}