"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ITCBadge from "@/components/ITCBadge";

interface SummaryData {
  today: {
    entry_count: number;
    sales_paise: number;
    gst_collected_paise: number;
    purchases_paise: number;
    itc_earned_paise: number;
    net_position_paise: number;
  };
  mtd: {
    entry_count: number;
    sales_paise: number;
    gst_collected_paise: number;
    purchases_paise: number;
    itc_earned_paise: number;
    net_position_paise: number;
  };
  sales_by_rate_slab: Record<number, number>;
  itc_by_status: Record<string, number>;
}

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

const RATE_COLORS: Record<number, string> = {
  0: "text-gray-400",
  5: "text-emerald-400",
  12: "text-cyan-400",
  18: "text-blue-400",
  28: "text-purple-400",
};

export default function RetailDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/retail-summary")
      .then(r => r.json())
      .then(json => {
        if (json.success) setSummary(json.data);
        else setError("Failed to load dashboard data");
      })
      .catch(() => setError("Network error — check your connection"))
      .finally(() => setLoading(false));
  }, []);

  const currentPeriod = new Date().toISOString().substring(0, 7);

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-xl tracking-tight">📊 Summary Dashboard</h1>
          <Link href="/retail/ledger" className="text-xs text-gray-500 hover:text-gray-300">View Ledger →</Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
              className="mt-2 text-xs text-red-400 underline">Retry</button>
          </div>
        )}

        {/* Today + MTD side by side */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Today</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 animate-pulse">
                    <div className="h-3 w-14 bg-gray-800 rounded mb-2" />
                    <div className="h-5 w-20 bg-gray-800 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <MetricRow label="Sales" value={summary?.today.sales_paise || 0} color="text-emerald-400" />
                <MetricRow label="GST Collected" value={summary?.today.gst_collected_paise || 0} color="text-cyan-400" />
                <MetricRow label="Purchases" value={summary?.today.purchases_paise || 0} color="text-orange-400" />
                <MetricRow label="ITC Earned" value={summary?.today.itc_earned_paise || 0} color="text-purple-400" />
                <MetricRow
                  label="Net Position"
                  value={summary?.today.net_position_paise || 0}
                  color={(summary?.today.net_position_paise ?? 0) >= 0 ? "text-red-400" : "text-emerald-400"}
                  highlight
                />
              </div>
            )}
            <p className="text-[10px] text-gray-600 mt-2">{summary?.today.entry_count || 0} entries today</p>
          </div>

          {/* MTD */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Month to Date</h2>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 animate-pulse">
                    <div className="h-3 w-14 bg-gray-800 rounded mb-2" />
                    <div className="h-5 w-20 bg-gray-800 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <MetricRow label="MTD Sales" value={summary?.mtd.sales_paise || 0} color="text-emerald-400" />
                <MetricRow label="MTD GST Collected" value={summary?.mtd.gst_collected_paise || 0} color="text-cyan-400" />
                <MetricRow label="MTD Purchases" value={summary?.mtd.purchases_paise || 0} color="text-orange-400" />
                <MetricRow label="MTD ITC Earned" value={summary?.mtd.itc_earned_paise || 0} color="text-purple-400" />
                <MetricRow
                  label="Net GST Payable"
                  value={summary?.mtd.net_position_paise || 0}
                  color={(summary?.mtd.net_position_paise ?? 0) >= 0 ? "text-red-400" : "text-emerald-400"}
                  highlight
                />
              </div>
            )}
            <p className="text-[10px] text-gray-600 mt-2">{summary?.mtd.entry_count || 0} entries MTD</p>
          </div>
        </section>

        {/* GST by Rate Slab + ITC Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by GST rate slab */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">GST Collected by Rate</h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-2">
              {loading ? (
                <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-gray-800 rounded" />)}</div>
              ) : Object.keys(summary?.sales_by_rate_slab || {}).length === 0 ? (
                <p className="text-xs text-gray-600">No sales data yet</p>
              ) : (
                Object.entries(summary?.sales_by_rate_slab || {})
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([rate, amount]) => (
                    <div key={rate} className="flex items-center justify-between">
                      <span className={`text-xs font-mono ${RATE_COLORS[Number(rate)] || "text-gray-400"}`}>{rate}% GST</span>
                      <span className="text-xs font-mono text-gray-300">{fmt(amount)}</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* ITC Breakdown by status */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">ITC Breakdown</h2>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-2">
              {loading ? (
                <div className="animate-pulse space-y-2">{[1,2,3].map(i => <div key={i} className="h-5 bg-gray-800 rounded" />)}</div>
              ) : Object.keys(summary?.itc_by_status || {}).length === 0 ? (
                <p className="text-xs text-gray-600">No purchase data yet</p>
              ) : (
                Object.entries(summary?.itc_by_status || {}).map(([status, amount]) => (
                  <div key={status} className="flex items-center justify-between">
                    <ITCBadge status={status} />
                    <span className="text-xs font-mono text-gray-300">{fmt(amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/retail/entry/new?type=SALE"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center hover:bg-emerald-500/10 transition-colors">
            <div className="text-2xl mb-1">💰</div>
            <span className="text-sm text-emerald-400">Add Sale</span>
          </Link>
          <Link href="/retail/entry/new?type=PURCHASE"
            className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-center hover:bg-orange-500/10 transition-colors">
            <div className="text-2xl mb-1">🛒</div>
            <span className="text-sm text-orange-400">Add Purchase</span>
          </Link>
          <Link href="/retail/ledger"
            className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center hover:bg-cyan-500/10 transition-colors">
            <div className="text-2xl mb-1">📒</div>
            <span className="text-sm text-cyan-400">View Ledger</span>
          </Link>
          <Link href={`/retail/reports/${currentPeriod}`}
            className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center hover:bg-purple-500/10 transition-colors">
            <div className="text-2xl mb-1">📊</div>
            <span className="text-sm text-purple-400">Month Report</span>
          </Link>
        </section>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color, highlight }: {
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border ${highlight ? "border-gray-700 bg-gray-900" : "border-gray-800 bg-gray-900/50"} px-3 py-2 flex items-center justify-between`}>
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className={`text-sm font-mono font-medium ${color}`}>{fmt(value)}</span>
    </div>
  );
}
