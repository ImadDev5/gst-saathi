"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Summary {
  todaySalesPaise: number;
  todayGstPaise: number;
  todayPurchasesPaise: number;
  todayItcPaise: number;
  mtdSalesPaise: number;
  mtdItcPaise: number;
  mtdGstPayablePaise: number;
}

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export default function RetailDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
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

  const todayMetrics = summary ? [
    { label: "Sales", value: fmt(summary.todaySalesPaise), color: "text-emerald-400" },
    { label: "GST Collected", value: fmt(summary.todayGstPaise), color: "text-cyan-400" },
    { label: "Purchases", value: fmt(summary.todayPurchasesPaise), color: "text-orange-400" },
    { label: "ITC", value: fmt(summary.todayItcPaise), color: "text-purple-400" },
  ] : [];

  const mtdMetrics = summary ? [
    { label: "MTD Sales", value: fmt(summary.mtdSalesPaise), color: "text-emerald-400" },
    { label: "MTD ITC", value: fmt(summary.mtdItcPaise), color: "text-purple-400" },
    { label: "GST Payable", value: fmt(summary.mtdGstPayablePaise), color: "text-red-400" },
  ] : [];

  const currentPeriod = new Date().toISOString().substring(0, 7);

  return (
    <div className="p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-sm uppercase tracking-widest text-gray-500">
            Module B — Retail Ledger
          </h1>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
              className="mt-2 text-xs text-red-400 underline">Retry</button>
          </div>
        )}

        {/* Today */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Today</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 animate-pulse">
                    <div className="h-3 w-14 bg-gray-800 rounded mb-2" />
                    <div className="h-6 w-20 bg-gray-800 rounded" />
                  </div>
                ))
              : todayMetrics.map(m => (
                  <div key={m.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-colors">
                    <h3 className="text-[10px] uppercase tracking-widest text-gray-500">{m.label}</h3>
                    <p className={`text-xl font-light font-mono mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                ))
            }
          </div>
        </section>

        {/* MTD */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Month to Date</h2>
          <div className="grid grid-cols-3 gap-3">
            {!loading && mtdMetrics.map(m => (
              <div key={m.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="text-[10px] uppercase tracking-widest text-gray-500">{m.label}</h3>
                <p className={`text-xl font-light font-mono mt-1 ${m.color}`}>{m.value}</p>
              </div>
            ))}
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
