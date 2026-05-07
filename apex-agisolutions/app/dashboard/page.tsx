"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import StatementUpload from "@/components/StatementUpload";
import TransactionTable from "@/components/TransactionTable";
import OverridePanel from "@/components/OverridePanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RefreshCcw,
  Share2,
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Receipt,
  Banknote,
  Layers,
  Copy,
  Check,
  FileInput,
} from "lucide-react";

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

interface StatementItem {
  id: string;
  filename: string;
  bank_name: string;
  status: string;
  error_message: string | null;
  created_at: string;
  transactionCount: number;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

const METRIC_CONFIG: { key: keyof Summary; label: string; icon: React.ElementType }[] = [
  { key: "totalEligiblePaise", label: "Tax saved", icon: ShieldCheck },
  { key: "totalBlockedPaise", label: "Can't claim", icon: AlertTriangle },
  { key: "totalRcmPaise", label: "Tax you must pay", icon: Receipt },
  { key: "totalAtRiskPaise", label: "At risk", icon: Clock },
  { key: "statementCount", label: "Statements", icon: Layers },
  { key: "totalTransactions", label: "Transactions", icon: Banknote },
];

const STATEMENT_STATUS: Record<string, { bg: string; text: string }> = {
  COMPLETED:  { bg: "bg-slate-100", text: "text-slate-700" },
  PROCESSING: { bg: "bg-slate-100", text: "text-slate-700" },
  FAILED:     { bg: "bg-slate-100", text: "text-slate-700" },
  PENDING:    { bg: "bg-slate-100", text: "text-slate-700" },
};

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [statements, setStatements] = useState<StatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatement, setActiveStatement] = useState<string | null>(null);
  const [overrideTxn, setOverrideTxn] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [caLink, setCaLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const [summaryRes, statementsRes] = await Promise.all([
        fetch("/api/v1/dashboard/summary"),
        fetch("/api/v1/statements"),
      ]);
      const summaryJson = await summaryRes.json();
      const statementsJson = await statementsRes.json();
      if (summaryJson.success) setSummary(summaryJson.data);
      if (statementsJson.success) setStatements(statementsJson.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [refreshKey]);

  const handleUploadComplete = (statementId: string) => {
    setActiveStatement(statementId);
    setRefreshKey((k) => k + 1);
  };

  const handleOverrideSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleShareCA = async () => {
    try {
      const res = await fetch("/api/v1/ca-viewer/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setCaLink(data.url);
      } else {
        alert(data.error || "Failed to generate CA link");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate link");
    }
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const res = await fetch("/api/v1/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      const data = await res.json();
      const reportId = data.data?.reportId || data.reportId;
      if (reportId) {
        const link = document.createElement("a");
        link.href = `/api/v1/reports/${reportId}/download?format=${format}`;
        link.download = `TaxApex_ITC_Report.${format === "excel" ? "xlsx" : "pdf"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Export failed. No report ID returned.");
      }
    } catch {
      alert("Export failed. Please try again.");
    }
  };

  const handleCopy = () => {
    if (caLink) {
      navigator.clipboard.writeText(caLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImportITC = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/v1/entries/import-itc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data.summary);
        setRefreshKey((k) => k + 1);
      } else {
        setImportResult(data.error || "No ITC to import");
      }
    } catch {
      setImportResult("Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Bank Statement Analyser
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Upload your bank statement to find tax you can claim back
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="text-slate-500 hover:text-slate-900"
            >
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareCA} className="border-slate-200">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share with CA
            </Button>
            <Popover>
              <PopoverTrigger>
                <Button variant="outline" size="sm" className="border-slate-200">
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1">
                <button
                  onClick={() => handleExport("excel")}
                  className="flex items-center w-full rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="flex items-center w-full rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Report
                </button>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportITC}
              disabled={importing || !summary || summary.totalTransactions === 0}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40"
            >
              {importing ? (
                <RefreshCcw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <FileInput className="w-3.5 h-3.5 mr-1.5" />
              )}
              {importing ? "Importing..." : "Add to monthly return"}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {caLink && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-medium text-slate-800">
                  Shareable CA Link (Valid for 7 days)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={caLink}
                  className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 font-mono"
                />
                <Button variant="outline" size="sm" onClick={handleCopy} className="border-slate-200">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {importResult && (
            <div className={`rounded-lg border p-4 ${importResult.includes("No ITC") || importResult.includes("failed") ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-center gap-2">
                {importResult.includes("No ITC") || importResult.includes("failed") ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                )}
                <p className={`text-sm font-medium ${importResult.includes("No ITC") || importResult.includes("failed") ? "text-amber-700" : "text-emerald-700"}`}>
                  {importResult}
                </p>
                <button
                  onClick={() => setImportResult(null)}
                  className="ml-auto text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>
              {!importResult.includes("No ITC") && !importResult.includes("failed") && (
                <a href="/retail" className="inline-block mt-2 text-xs text-emerald-600 hover:text-emerald-800 underline">
                  View in Retail Ledger →
                </a>
              )}
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="h-3 w-16 bg-slate-100 rounded mb-3 animate-pulse" />
                    <div className="h-7 w-20 bg-slate-50 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))
            : METRIC_CONFIG.map((m) => {
                const Icon = m.icon;
                const raw = summary?.[m.key as keyof Summary] as number;
                const value = m.key.includes("Paise") ? formatPaise(raw) : String(raw);
                return (
                  <Card key={m.key} className="shadow-sm hover:shadow-md transition-shadow duration-150">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                          {m.label}
                        </h2>
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <p className="text-xl font-semibold text-slate-900 tabular-nums">
                        {value}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
            Upload Bank Statement (CSV)
          </h2>
          <Card className="shadow-sm">
            <CardContent className="p-5">
              <StatementUpload onUploadComplete={handleUploadComplete} />
            </CardContent>
          </Card>
        </div>

        {statements.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">
              Uploaded Statements
            </h2>
            <Card className="shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-3 font-medium">File</th>
                      <th className="text-left px-4 py-3 font-medium">Bank</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Transactions</th>
                      <th className="text-left px-4 py-3 font-medium">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((stmt) => {
                      const statusConfig = STATEMENT_STATUS[stmt.status] || STATEMENT_STATUS.PENDING;
                      return (
                        <tr
                          key={stmt.id}
                          className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-900 truncate max-w-[200px]">
                            {stmt.filename}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {stmt.bank_name}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              {stmt.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">
                            {stmt.transactionCount}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {new Date(stmt.created_at).toLocaleDateString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {(summary?.totalTransactions ?? 0) > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                Classified Transactions
              </h2>
              <span className="text-xs text-slate-400 tabular-nums">
                {summary?.totalTransactions}
              </span>
            </div>
            <TransactionTable
              key={refreshKey}
              statementId={activeStatement || undefined}
              onOverride={(txn) => setOverrideTxn(txn)}
            />
          </div>
        )}

        <OverridePanel
          transaction={overrideTxn}
          onClose={() => setOverrideTxn(null)}
          onSaved={handleOverrideSaved}
        />
      </div>
    </div>
  );
}