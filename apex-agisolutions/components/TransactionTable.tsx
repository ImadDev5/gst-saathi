"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ITCBadge from "@/components/ITCBadge";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  itc_status: string;
  gst_amount: number;
  mapped_vendor_name: string | null;
  block_reason: string | null;
  action_required?: string | null;
  confidence?: number | null;
  rcm_type?: string | null;
}

interface Props {
  statementId?: string;
  onOverride?: (txn: Transaction) => void;
}

const FILTER_OPTIONS = ["", "ELIGIBLE", "BLOCKED", "RCM", "CONDITIONAL", "AT_RISK", "UNKNOWN"];

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function TransactionTable({ statementId, onOverride }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<"transaction_date" | "amount">("transaction_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const perPage = 25;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (statementId) params.set("statement_id", statementId);
    if (filter) params.set("itc_status", filter);

    try {
      const res = await fetch(`/api/v1/transactions?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load transactions");
      }

      let sorted = [...(json.data || [])];
      sorted.sort((a: Transaction, b: Transaction) => {
        const aVal = sortField === "amount" ? a.amount : new Date(a.transaction_date).getTime();
        const bVal = sortField === "amount" ? b.amount : new Date(b.transaction_date).getTime();
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      });
      setTransactions(sorted);
      setTotal(json.meta?.total || 0);
    } catch (error) {
      console.error("Failed to load transactions", error);
      setTransactions([]);
      setTotal(0);
      setLoadError(
        error instanceof Error ? error.message : "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  }, [page, filter, statementId, sortField, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSort = (field: "transaction_date" | "amount") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Filter:</span>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "ghost"}
              size="sm"
              onClick={() => { setFilter(s); setPage(1); }}
              className={
                filter === s
                  ? "bg-slate-900 text-white hover:bg-slate-800 h-7 text-xs rounded-full"
                  : "h-7 text-xs rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              }
            >
              {s || "All"}
            </Button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400 tabular-nums">
          {total} transactions
        </span>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th
                  className="px-4 py-3 text-left font-medium cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => toggleSort("transaction_date")}
                >
                  Date {sortField === "transaction_date" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-left font-medium">Narration</th>
                <th className="px-4 py-3 text-left font-medium">Vendor</th>
                <th
                  className="px-4 py-3 text-right font-medium cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => toggleSort("amount")}
                >
                  Amount {sortField === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-4 py-3 text-right font-medium">GST</th>
                <th className="px-4 py-3 text-center font-medium">ITC Status</th>
                <th className="px-4 py-3 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 w-32 bg-slate-100 rounded mx-auto" />
                      <div className="h-4 w-48 bg-slate-50 rounded mx-auto" />
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-red-600">
                    Failed to load transactions. Refresh and try again.
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(txn.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3 text-slate-900 max-w-[250px] truncate text-xs" title={txn.description}>
                      {txn.description}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {txn.mapped_vendor_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 font-mono text-xs tabular-nums">
                      {formatPaise(txn.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 font-mono text-xs tabular-nums">
                      {formatPaise(txn.gst_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ITCBadge status={txn.itc_status} />
                      {txn.confidence != null && (
                        <span className="inline-block ml-1 text-[9px] text-slate-400 tabular-nums" title={`${(txn.confidence * 100).toFixed(0)}% confidence`}>
                          {(txn.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOverride?.(txn)}
                        className="text-slate-500 hover:text-slate-900 h-7 text-xs hover:bg-slate-100"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-8 text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Prev
          </Button>
          <span className="text-xs text-slate-500 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-8 text-xs"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}