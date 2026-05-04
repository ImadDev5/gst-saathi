"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ITCBadge from "@/components/ITCBadge";

interface LineItem {
  id: string;
  product_name: string;
  quantity: number;
  rate_paise: number;
  total_paise: number;
  gst_rate: number;
  itc_status: string;
  itc_amount_paise: number;
  block_reason?: string;
}

interface Entry {
  id: string;
  entry_type: string;
  entry_date: string;
  payment_mode: string;
  customer_type: string;
  party_name?: string;
  party_gstin?: string;
  invoice_number?: string;
  period_locked: boolean;
  has_invoice: boolean;
  entry_line_items: LineItem[];
  computed: {
    total_paise: number;
    total_gst_paise: number;
    total_itc_paise: number;
    total_taxable: number;
  };
}

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const TYPE_COLORS: Record<string, string> = {
  SALE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  PURCHASE: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  SALE_RETURN: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  PURCHASE_RETURN: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function LedgerPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    if (!res.ok) {
      const json = await res.json();
      if (res.status === 423) {
        alert("Cannot delete — this period has been filed. Create an amendment instead.");
      }
      return;
    }
    fetchData();
  };

  const totalPages = Math.ceil(total / perPage);
  const isPurchase = (type: string) => type === "PURCHASE" || type === "PURCHASE_RETURN";

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
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
              {t || "All"}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-500 self-center">{total} entries</span>
        </div>

        {/* Entries */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-gray-500 animate-pulse">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No entries yet</div>
          ) : entries.map(e => (
            <div key={e.id} className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
              {/* Entry header row */}
              <div
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-900/50 transition-colors"
              >
                {/* Type badge */}
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${TYPE_COLORS[e.entry_type] || "text-gray-400"}`}>
                  {e.entry_type.replace("_", " ")}
                </span>

                {/* Date */}
                <span className="text-xs text-gray-400 w-20">
                  {new Date(e.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                </span>

                {/* Products summary */}
                <span className="text-sm text-gray-300 truncate flex-1">
                  {e.entry_line_items?.slice(0, 3).map(li => li.product_name).join(", ")}
                  {(e.entry_line_items?.length || 0) > 3 && <span className="text-gray-600"> +{e.entry_line_items.length - 3} more</span>}
                </span>

                {/* Total */}
                <span className="font-mono text-sm text-white shrink-0">{fmt(e.computed?.total_paise || 0)}</span>

                {/* ITC badge for purchases */}
                {isPurchase(e.entry_type) && (
                  <ITCBadge status={e.entry_line_items?.[0]?.itc_status || "UNKNOWN"} />
                )}

                {/* Payment mode */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                  e.payment_mode === "CASH" ? "bg-green-500/10 text-green-400" :
                  e.payment_mode === "ONLINE" ? "bg-blue-500/10 text-blue-400" :
                  "bg-yellow-500/10 text-yellow-400"
                }`}>
                  {e.payment_mode}
                </span>

                {/* Invoice indicator */}
                {e.has_invoice && <span className="text-gray-600 text-xs shrink-0" title="Has invoice">📎</span>}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  {!e.period_locked ? (
                    <>
                      <Link href={`/retail/entry/${e.id}/edit`}
                        className="rounded px-2 py-1 text-[10px] text-gray-500 hover:text-cyan-400 hover:bg-gray-800">
                        ✏️
                      </Link>
                      <button onClick={() => handleDelete(e.id)}
                        className="rounded px-2 py-1 text-[10px] text-gray-500 hover:text-red-400 hover:bg-gray-800">
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href={`/retail/entry/${e.id}/edit`}
                        className="rounded px-2 py-1 text-[10px] text-gray-600 hover:text-cyan-400" title="View/Amend">
                        ✏️
                      </Link>
                      <span className="text-[10px] text-gray-600" title="Period filed">🔒</span>
                    </>
                  )}
                </div>

                {/* Expand indicator */}
                <span className="text-gray-600 text-xs shrink-0">{expandedId === e.id ? "▲" : "▼"}</span>
              </div>

              {/* Expanded line items */}
              {expandedId === e.id && (
                <div className="border-t border-gray-800 px-4 py-3 bg-gray-950/80">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-600 uppercase border-b border-gray-800/50">
                        <th className="py-1.5 text-left font-medium">Product</th>
                        <th className="py-1.5 text-right font-medium">Qty</th>
                        <th className="py-1.5 text-right font-medium">Rate</th>
                        <th className="py-1.5 text-right font-medium">Taxable</th>
                        <th className="py-1.5 text-right font-medium">GST</th>
                        <th className="py-1.5 text-right font-medium">Total</th>
                        {isPurchase(e.entry_type) && (
                          <>
                            <th className="py-1.5 text-center font-medium">ITC</th>
                            <th className="py-1.5 text-right font-medium">ITC Amt</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(e.entry_line_items || []).map(li => (
                        <tr key={li.id} className="border-b border-gray-800/30">
                          <td className="py-1.5 text-gray-300">{li.product_name}</td>
                          <td className="py-1.5 text-right text-gray-400 font-mono">{li.quantity}</td>
                          <td className="py-1.5 text-right text-gray-400 font-mono">{fmt(li.rate_paise)}</td>
                          <td className="py-1.5 text-right text-gray-400 font-mono">{fmt(li.total_paise - li.gst_rate ? Math.round(li.total_paise * 100 / (100 + li.gst_rate)) : li.total_paise)}</td>
                          <td className="py-1.5 text-right text-gray-400 font-mono">{li.gst_rate}%</td>
                          <td className="py-1.5 text-right text-white font-mono">{fmt(li.total_paise)}</td>
                          {isPurchase(e.entry_type) && (
                            <>
                              <td className="py-1.5 text-center"><ITCBadge status={li.itc_status} /></td>
                              <td className="py-1.5 text-right font-mono text-emerald-400">{fmt(li.itc_amount_paise)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Entry meta */}
                  <div className="mt-3 flex gap-4 text-[11px] text-gray-600">
                    {e.party_name && <span>Party: {e.party_name}</span>}
                    {e.party_gstin && <span>GSTIN: {e.party_gstin}</span>}
                    {e.invoice_number && <span>Invoice: {e.invoice_number}</span>}
                    {e.customer_type && <span>{e.customer_type}</span>}
                    {e.period_locked && <span className="text-red-500">Period Filed</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
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
