"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

const STATUS_COLORS: Record<string, string> = {
  NEW: "text-gray-400",
  ASSIGNED: "text-yellow-400",
  CONTACTED: "text-blue-400",
  ONBOARDED: "text-emerald-400",
  REJECTED: "text-red-400",
};

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

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="border-b border-gray-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl tracking-tight">
              GST<span className="text-cyan-400">Saathi</span>{" "}
              <span className="text-sm text-gray-500 font-normal">Admin Panel</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to site
            </a>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Total Contacts
            </h2>
            <p className="text-2xl font-light font-mono text-white">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Pending
            </h2>
            <p className="text-2xl font-light font-mono text-yellow-400">{stats.new}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Tokens Assigned
            </h2>
            <p className="text-2xl font-light font-mono text-emerald-400">{stats.assigned}</p>
          </div>
        </section>

        {/* Contacts Table */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">
            Contact Submissions
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No contacts yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Email</th>
                      <th className="text-left p-3 hidden sm:table-cell">Business</th>
                      <th className="text-left p-3 hidden md:table-cell">Phone</th>
                      <th className="text-left p-3 hidden lg:table-cell">GSTIN</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3 hidden xl:table-cell">Token</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c) => (
                      <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3 text-gray-400">{c.email}</td>
                        <td className="p-3 text-gray-400 hidden sm:table-cell">{c.business_name}</td>
                        <td className="p-3 text-gray-400 hidden md:table-cell">{c.phone}</td>
                        <td className="p-3 text-gray-400 hidden lg:table-cell font-mono text-xs">{c.gstin || "—"}</td>
                        <td className="p-3">
                          <span className={`text-xs font-mono ${STATUS_COLORS[c.status] || "text-gray-400"}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 hidden xl:table-cell">
                          {c.assigned_token ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                                {c.assigned_token.slice(0, 8)}...
                              </code>
                              <button
                                onClick={() => handleCopyUrl(c.assigned_token!)}
                                className="text-xs text-gray-500 hover:text-white transition-colors"
                              >
                                {copiedId === c.assigned_token ? "✓" : "📋"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {c.assigned_token ? (
                            <span className="text-xs text-emerald-400">✓ Active</span>
                          ) : (
                            <button
                              onClick={() => handleGenerateToken(c.id)}
                              disabled={generating === c.id}
                              className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded transition-colors disabled:opacity-30"
                            >
                              {generating === c.id ? "..." : "Generate Token"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
