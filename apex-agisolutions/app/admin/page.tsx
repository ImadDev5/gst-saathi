"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Clock, CheckCircle2, LogOut, Copy, Check, RefreshCcw } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  business_name: string;
  gstin: string | null;
  status: string;
  assigned_token: string | null;
  token_assigned_at: string | null;
  created_at: string;
  contact_tokens: { trial_sessions: { token: string; status: string; expires_at: string } }[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, assigned: 0, new: 0 });
  const router = useRouter();

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/v1/admin/contacts");
      const json = await res.json();
      if (json.success) {
        setContacts(json.data);
        setStats({
          total: json.data.length,
          assigned: json.data.filter((c: Contact) => c.assigned_token).length,
          new: json.data.filter((c: Contact) => c.status === "NEW").length,
        });
      }
    } catch (err) {
      console.error("Fetch contacts error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleGenerateToken = async (contactId: string) => {
    setGenerating(contactId);
    try {
      const res = await fetch("/api/v1/admin/tokens/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const json = await res.json();
      if (json.success) {
        fetchContacts();
      } else {
        alert(json.error);
      }
    } catch {
      alert("Failed to generate token");
    } finally {
      setGenerating(null);
    }
  };

  const handleCopyUrl = async (token: string) => {
    const url = `${window.location.origin}/signin?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await fetch("/api/v1/admin/logout", { method: "POST" });
    router.push("/admin/signin");
  };

  const statCards = [
    { label: "Total Contacts", value: stats.total, icon: Users },
    { label: "Pending", value: stats.new, icon: Clock },
    { label: "Tokens Assigned", value: stats.assigned, icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 p-6">
      <TooltipProvider>
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Tax<span className="text-slate-500">Apex</span>{" "}
                <span className="text-sm text-slate-500 font-normal">Admin Panel</span>
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="/" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">
                &larr; Back to site
              </a>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-slate-200">
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Logout
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className="shadow-sm border-slate-200 hover:shadow-md transition-shadow duration-150">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                        {s.label}
                      </h2>
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-semibold text-slate-900 tabular-nums">{s.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Contact Submissions
              </h2>
              <Button variant="ghost" size="sm" onClick={fetchContacts} className="h-7">
                <RefreshCcw className="w-3 h-3" />
              </Button>
            </div>
            <Card className="shadow-sm border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Business</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Phone</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">GSTIN</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Token</th>
                      <th className="text-left px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                          <div className="animate-pulse space-y-2">
                            <div className="h-4 w-32 bg-slate-100 rounded mx-auto" />
                            <div className="h-4 w-48 bg-slate-50 rounded mx-auto" />
                          </div>
                        </td>
                      </tr>
                    ) : contacts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No contacts yet</td>
                      </tr>
                    ) : (
                      contacts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                          <td className="px-4 py-3 text-slate-500">{c.email}</td>
                          <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{c.business_name}</td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{c.phone}</td>
                          <td className="px-4 py-3 text-slate-500 hidden lg:table-cell font-mono text-xs">{c.gstin || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            {c.assigned_token ? (
                              <div className="flex items-center gap-2">
                                <code className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono tabular-nums">
                                  {c.assigned_token.slice(0, 8)}...
                                </code>
                                <Tooltip>
                                  <TooltipTrigger
                                    onClick={() => handleCopyUrl(c.assigned_token!)}
                                    className="text-slate-400 hover:text-slate-900 transition-colors"
                                  >
                                    {copiedId === c.assigned_token ? (
                                      <Check className="w-3 h-3 text-slate-700" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent>Copy sign-in URL</TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {c.assigned_token ? (
                              <span className="text-xs text-slate-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGenerateToken(c.id)}
                                disabled={generating === c.id}
                                className="h-7 text-xs border-slate-200"
                              >
                                {generating === c.id ? "..." : "Generate Token"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}