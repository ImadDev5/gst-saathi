"use client";

import { useState, useEffect, useCallback } from "react";

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

interface Props {
  statementId?: string;
  onOverride?: (txn: Transaction) => void;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ELIGIBLE:    { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Eligible" },
  BLOCKED:     { bg: "bg-red-500/15",     text: "text-red-400",     label: "Blocked" },
  RCM:         { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "RCM" },
  CONDITIONAL: { bg: "bg-orange-500/15",  text: "text-orange-400",  label: "Conditional" },
  UNKNOWN:     { bg: "bg-gray-500/15",    text: "text-gray-400",    label: "Unknown" },
  AT_RISK:     { bg: "bg-yellow-500/15",  text: "text-yellow-400",  label: "At Risk" },
};

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function TransactionTable({ statementId, onOverride }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<"transaction_date" | "amount">("transaction_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const perPage = 25;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (statementId) params.set("statement_id", statementId);
    if (filter) params.set("itc_status", filter);

    const res = await fetch(`/api/v1/transactions?${params}`);
    const json = await res.json();

    if (json.success) {
      let sorted = [...(json.data || [])];
      sorted.sort((a: Transaction, b: Transaction) => {
        const aVal = sortField === "amount" ? a.amount : new Date(a.transaction_date).getTime();
        const bVal = sortField === "amount" ? b.amount : new Date(b.transaction_date).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
      setTransactions(sorted);
      setTotal(json.meta?.total || 0);
    }
    setLoading(false);
  }, [page, filter, statementId, sortField, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (field: "transaction_date" | "amount") => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Filter:</span>
        {["", "ELIGIBLE", "BLOCKED", "RCM", "UNKNOWN"].map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs transition-all ${
              filter === s
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
            }`}
          >
            {s || "All"}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500">{total} transactions</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/80 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th
                className="px-4 py-3 text-left cursor-pointer hover:text-gray-300"
                onClick={() => toggleSort("transaction_date")}
              >
                Date {sortField === "transaction_date" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left">Narration</th>
              <th className="px-4 py-3 text-left">Vendor</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-gray-300"
                onClick={() => toggleSort("amount")}
              >
                Amount {sortField === "amount" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-right">GST</th>
              <th className="px-4 py-3 text-center">ITC Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <div className="animate-pulse">Loading transactions...</div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const badge = STATUS_BADGE[txn.itc_status] || STATUS_BADGE.UNKNOWN;
                return (
                  <tr key={txn.id} className="hover:bg-gray-900/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(txn.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3 text-gray-200 max-w-[250px] truncate" title={txn.description}>
                      {txn.description}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {txn.mapped_vendor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-200 font-mono">
                      {formatPaise(txn.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 font-mono">
                      {formatPaise(txn.gst_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onOverride?.(txn)}
                        className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                        title="Override classification"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded px-3 py-1 text-xs bg-gray-800 text-gray-400 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded px-3 py-1 text-xs bg-gray-800 text-gray-400 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
