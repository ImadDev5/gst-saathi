"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Entry {
  id: string;
  entry_type: string;
  entry_date: string;
  product_name: string;
  quantity: number;
  rate_paise: number;
  total_paise: number;
  gst_rate: number;
  payment_mode: string;
  customer_type: string;
  period_locked: boolean;
}

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const TYPE_COLORS: Record<string, string> = {
  SALE: "text-emerald-400",
  PURCHASE: "text-orange-400",
  SALE_RETURN: "text-yellow-400",
  PURCHASE_RETURN: "text-red-400",
};

export default function LedgerPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const perPage = 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (filter) params.set("type", filter);

    const res = await fetch(`/api/v1/entries?${params}`);
    const json = await res.json();
    if (json.success) {
      setEntries(json.data);
      setTotal(json.meta.total);
    }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;

    const res = await fetch(`/api/v1/entries/${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-mono text-xl tracking-tight">📒 Ledger</h1>
          <div className="flex gap-2">
            <Link href="/retail/entry/new?type=SALE"
              className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20">+ Sale</Link>
            <Link href="/retail/entry/new?type=PURCHASE"
              className="rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 text-xs text-orange-400 hover:bg-orange-500/20">+ Purchase</Link>
            <Link href="/retail" className="text-xs text-gray-500 hover:text-gray-300 self-center ml-2">← Dashboard</Link>
          </div>
        </header>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["", "SALE", "PURCHASE", "SALE_RETURN", "PURCHASE_RETURN"].map(t => (
            <button key={t} onClick={() => { setFilter(t); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs ${filter === t ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-gray-800 text-gray-400 border border-gray-700"}`}>
              {t || "All"} {t ? t.replace("_", " ").toLowerCase() : ""}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-500 self-center">{total} entries</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">GST</th>
                <th className="px-4 py-3 text-center">Pay</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr><td colSpan={9} className="p-12 text-center text-gray-500 animate-pulse">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={9} className="p-12 text-center text-gray-500">No entries yet</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-900/30 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(e.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${TYPE_COLORS[e.entry_type] || "text-gray-400"}`}>
                    {e.entry_type.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{e.product_name}</td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono">{e.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono">{fmt(e.rate_paise)}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{fmt(e.total_paise)}</td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{e.gst_rate}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.payment_mode === "CASH" ? "bg-green-500/10 text-green-400" : e.payment_mode === "ONLINE" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                      {e.payment_mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!e.period_locked ? (
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-red-400/50 hover:text-red-400">✕</button>
                    ) : (
                      <span className="text-xs text-gray-600" title="Period filed">🔒</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded px-3 py-1 text-xs bg-gray-800 text-gray-400 disabled:opacity-30">← Prev</button>
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded px-3 py-1 text-xs bg-gray-800 text-gray-400 disabled:opacity-30">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
