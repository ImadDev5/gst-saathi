"use client";

import { useState, useEffect } from "react";
import StatementUpload from "@/components/StatementUpload";
import TransactionTable from "@/components/TransactionTable";
import OverridePanel from "@/components/OverridePanel";

interface Summary {
  statementCount: number;
  totalTransactions: number;
  totalEligiblePaise: number;
  totalBlockedPaise: number;
  totalAtRiskPaise: number;
  totalRcmPaise: number;
  totalNeedsInvoicePaise: number;
  totalUnknownPaise: number;
}

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  itc_status: string;
  gst_amount: number;
  mapped_vendor_name: string | null;
  block_reason: string | null;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatement, setActiveStatement] = useState<string | null>(null);
  const [overrideTxn, setOverrideTxn] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/v1/dashboard/summary");
      const json = await res.json();
      if (json.success) setSummary(json.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [refreshKey]);

  const handleUploadComplete = (statementId: string) => {
    setActiveStatement(statementId);
    setRefreshKey((k) => k + 1);
  };

  const handleOverrideSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  const metrics = summary
    ? [
        { label: "Statements", value: String(summary.statementCount), color: "text-white" },
        { label: "Eligible ITC", value: formatPaise(summary.totalEligiblePaise), color: "text-emerald-400" },
        { label: "Blocked", value: formatPaise(summary.totalBlockedPaise), color: "text-red-400" },
        { label: "At Risk", value: formatPaise(summary.totalAtRiskPaise), color: "text-yellow-400" },
        { label: "RCM Payable", value: formatPaise(summary.totalRcmPaise), color: "text-amber-400" },
        { label: "Transactions", value: String(summary.totalTransactions), color: "text-gray-300" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="border-b border-gray-800 pb-4 flex items-center justify-between">
          <div>
            <h1 className="font-mono text-2xl tracking-tight">
              GST<span className="text-cyan-400">Saathi</span>{" "}
              <span className="text-sm text-gray-500 font-normal">Module A — ITC Pre-Processor</span>
            </h1>
          </div>
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back</a>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 animate-pulse">
                  <div className="h-3 w-16 bg-gray-800 rounded mb-3" />
                  <div className="h-7 w-20 bg-gray-800 rounded" />
                </div>
              ))
            : metrics.map((m) => (
                <div key={m.label} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-colors">
                  <h2 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">{m.label}</h2>
                  <p className={`text-xl sm:text-2xl font-light font-mono ${m.color}`}>{m.value}</p>
                </div>
              ))
          }
        </section>

        {/* Upload Section */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Upload Bank Statement</h2>
          <StatementUpload onUploadComplete={handleUploadComplete} />
        </section>

        {/* Transactions */}
        {(summary?.totalTransactions ?? 0) > 0 && (
          <section>
            <h2 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Classified Transactions</h2>
            <TransactionTable
              key={refreshKey}
              statementId={activeStatement || undefined}
              onOverride={(txn) => setOverrideTxn(txn)}
            />
          </section>
        )}

        {/* Override Panel */}
        <OverridePanel
          transaction={overrideTxn}
          onClose={() => setOverrideTxn(null)}
          onSaved={handleOverrideSaved}
        />
      </div>
    </div>
  );
}