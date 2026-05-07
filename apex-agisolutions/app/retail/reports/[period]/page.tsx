"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, ArrowLeft, Copy, Check } from "lucide-react";

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export default function MonthReportPage() {
  const params = useParams();
  const period = params.period as string; // YYYY-MM

  const [tab, setTab] = useState<"summary" | "gstr1" | "gstr3b" | "unified">("summary");
  const [gstr1, setGstr1] = useState<Record<string, unknown> | null>(null);
  const [gstr3b, setGstr3b] = useState<Record<string, unknown> | null>(null);
  const [unified, setUnified] = useState<Record<string, unknown> | null>(null);
  const [unifiedMeta, setUnifiedMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/reports/gstr1?period=${period}`).then(r => r.json()),
      fetch(`/api/v1/reports/gstr3b?period=${period}`).then(r => r.json()),
      fetch(`/api/v1/reports/gstr3b-unified?period=${period}`).then(r => r.json()),
    ]).then(([g1, g3b, uni]) => {
      if (g1.success) setGstr1(g1.data);
      if (g3b.success) setGstr3b(g3b.data);
      if (uni.success) {
        setUnified(uni.data);
        setUnifiedMeta(uni.meta);
      }
    }).finally(() => setLoading(false));
  }, [period]);

  const copy = (label: string, value: number) => {
    navigator.clipboard.writeText(fmt(value));
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const periodLabel = (() => {
    const [y, m] = period.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  })();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderGSTR3BRow = (key: string, section: any) => (
    <tr key={key} className="hover:bg-slate-50/50 transition-colors">
      <td className="px-4 py-3 text-slate-500 text-xs">{key}</td>
      <td className="px-4 py-3 text-slate-900 text-sm">{section.label}</td>
      <td className="px-4 py-3 text-right font-mono text-slate-700 text-sm tabular-nums">
        {section.igstPaise !== undefined ? fmt(section.igstPaise) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-700 text-sm tabular-nums">
        {section.cgstPaise !== undefined ? fmt(section.cgstPaise) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-slate-700 text-sm tabular-nums">
        {section.sgstPaise !== undefined ? fmt(section.sgstPaise) : "—"}
      </td>
      <td className="px-4 py-3 text-center">
        {section.totalPayablePaise !== undefined && (
          <button
            onClick={() => copy(key, section.totalPayablePaise)}
            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
          >
            {copied === key ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />}
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{periodLabel} Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Your tax report for this month</p>
          </div>
          <Link href="/retail" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(["summary", "gstr1", "gstr3b", "unified"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-2 text-xs uppercase tracking-wider font-medium transition-colors ${tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
              {t === "summary" ? "Summary" : t === "gstr1" ? "Sales (GSTR-1)" : t === "gstr3b" ? "Tax to pay (GSTR-3B)" : "Combined"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse">Loading report data...</div>
        ) : (
          <>
            {/* Summary Tab */}
            {tab === "summary" && gstr3b && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(gstr3b).map(([key, section]) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const s = section as any;
                  return (
                    <Card key={key} className="shadow-sm border-slate-200">
                      <CardContent className="p-5">
                        <h3 className="text-[11px] uppercase text-slate-500 tracking-wider font-medium">{s.label}</h3>
                        {s.taxablePaise !== undefined && (
                          <p className="text-xl font-semibold font-mono text-slate-900 mt-2 tabular-nums">{fmt(s.taxablePaise)}</p>
                        )}
                        {s.totalPayablePaise !== undefined && (
                          <p className="text-xl font-semibold font-mono text-slate-900 mt-2 tabular-nums">{fmt(s.totalPayablePaise)}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* GSTR-1 Tab */}
            {tab === "gstr1" && gstr1 && (
              <div className="space-y-5">
                {/* B2C Consolidated */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Sales to regular customers (B2C)</h3>
                  <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-xs uppercase text-slate-500 tracking-wider">
                            <th className="px-4 py-3 text-left font-medium">Rate</th>
                            <th className="px-4 py-3 text-right font-medium">Before tax</th>
                            <th className="px-4 py-3 text-right font-medium">Central tax</th>
                            <th className="px-4 py-3 text-right font-medium">State tax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {((gstr1 as any).b2cConsolidated || []).map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-600 text-sm">{row.gstRate}%</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-900 text-sm tabular-nums">{fmt(row.taxablePaise)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-500 text-sm tabular-nums">{fmt(row.cgstPaise)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-500 text-sm tabular-nums">{fmt(row.sgstPaise)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* HSN Summary */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Product code summary (HSN)</h3>
                  <Card className="shadow-sm border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-xs uppercase text-slate-500 tracking-wider">
                            <th className="px-4 py-3 text-left font-medium">Code</th>
                            <th className="px-4 py-3 text-left font-medium">Description</th>
                            <th className="px-4 py-3 text-right font-medium">Qty</th>
                            <th className="px-4 py-3 text-right font-medium">Before tax</th>
                            <th className="px-4 py-3 text-right font-medium">Tax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {((gstr1 as any).hsnSummary || []).map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-slate-600 font-mono text-sm">{row.hsnCode}</td>
                              <td className="px-4 py-3 text-slate-900 max-w-[200px] truncate text-sm">{row.description}</td>
                              <td className="px-4 py-3 text-right text-slate-500 text-sm tabular-nums">{row.quantity}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-900 text-sm tabular-nums">{fmt(row.taxablePaise)}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-500 text-sm tabular-nums">{fmt(row.totalTaxPaise)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* GSTR-3B Tab */}
            {tab === "gstr3b" && gstr3b && (
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr className="text-xs uppercase text-slate-500 tracking-wider">
                        <th className="px-4 py-3 text-left font-medium">Section</th>
                        <th className="px-4 py-3 text-left font-medium">What</th>
                        <th className="px-4 py-3 text-right font-medium">Inter-state</th>
                        <th className="px-4 py-3 text-right font-medium">Central</th>
                        <th className="px-4 py-3 text-right font-medium">State</th>
                        <th className="px-4 py-3 text-center font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(gstr3b).map(([key, section]) => renderGSTR3BRow(key, section))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Unified Tab */}
            {tab === "unified" && unified && (
              <div className="space-y-5">
                {/* Module A summary banner */}
                {unifiedMeta && (
                  <Card className="shadow-sm border-slate-200">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Banknote className="w-5 h-5 text-slate-500" />
                        <h3 className="text-sm font-medium text-slate-700">Tax from bank statements</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[11px] uppercase text-slate-500 tracking-wider font-medium">Claimable purchases</p>
                          <p className="text-xl font-semibold font-mono text-slate-900 mt-1 tabular-nums">{(unifiedMeta as any).moduleA?.eligibleCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-slate-500 tracking-wider font-medium">Tax you can claim</p>
                          <p className="text-xl font-semibold font-mono text-slate-900 mt-1 tabular-nums">{fmt((unifiedMeta as any).moduleA?.totalItcPaise || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-slate-500 tracking-wider font-medium">Missed claims</p>
                          <p className="text-xl font-semibold font-mono text-slate-900 mt-1 tabular-nums">{fmt((unifiedMeta as any).moduleA?.potentialLeakagePaise || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* GSTR-3B Unified Table */}
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-xs uppercase text-slate-500 tracking-wider">
                          <th className="px-4 py-3 text-left font-medium">Section</th>
                          <th className="px-4 py-3 text-left font-medium">What</th>
                          <th className="px-4 py-3 text-right font-medium">Inter-state</th>
                          <th className="px-4 py-3 text-right font-medium">Central</th>
                          <th className="px-4 py-3 text-right font-medium">State</th>
                          <th className="px-4 py-3 text-center font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Object.entries(unified).map(([key, section]) => {
                          const s = section as any;
                          const isBankItc = key === "4_A_bank_itc";
                          return (
                            <tr key={key} className={`${isBankItc ? "bg-slate-50/50" : ""} hover:bg-slate-50/50 transition-colors`}>
                              <td className="px-4 py-3 text-slate-500 text-xs">{key}</td>
                              <td className="px-4 py-3 text-slate-900 text-sm">
                                {s.label}
                                {isBankItc && (
                                  <span className="ml-2 text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md font-medium">
                                    {s.eligibleCount} txns
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 text-sm tabular-nums">
                                {s.igstPaise !== undefined ? fmt(s.igstPaise) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 text-sm tabular-nums">
                                {s.cgstPaise !== undefined ? fmt(s.cgstPaise) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 text-sm tabular-nums">
                                {s.sgstPaise !== undefined ? fmt(s.sgstPaise) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {s.totalPayablePaise !== undefined && (
                                  <button
                                    onClick={() => copy(key, s.totalPayablePaise)}
                                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                                  >
                                    {copied === key ? <Check className="w-3 h-3 inline" /> : <Copy className="w-3 h-3 inline" />}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Module B summary */}
                {unifiedMeta && (
                  <p className="text-xs text-slate-400 text-center">
                    Combined: {(unifiedMeta as any).moduleB?.entryCount || 0} retail entries + {(unifiedMeta as any).moduleA?.eligibleCount || 0} bank statement ITC transactions
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}