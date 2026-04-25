"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

export default function MonthReportPage() {
  const params = useParams();
  const period = params.period as string; // YYYY-MM

  const [tab, setTab] = useState<"summary" | "gstr1" | "gstr3b">("summary");
  const [gstr1, setGstr1] = useState<Record<string, unknown> | null>(null);
  const [gstr3b, setGstr3b] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/v1/reports/gstr1?period=${period}`).then(r => r.json()),
      fetch(`/api/v1/reports/gstr3b?period=${period}`).then(r => r.json()),
    ]).then(([g1, g3b]) => {
      if (g1.success) setGstr1(g1.data);
      if (g3b.success) setGstr3b(g3b.data);
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
    <tr key={key} className="hover:bg-gray-900/30 transition-colors">
      <td className="px-4 py-3 text-gray-400 text-xs">{key}</td>
      <td className="px-4 py-3 text-gray-200 text-sm">{section.label}</td>
      <td className="px-4 py-3 text-right font-mono text-gray-300">
        {section.igstPaise !== undefined ? fmt(section.igstPaise) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-300">
        {section.cgstPaise !== undefined ? fmt(section.cgstPaise) : "—"}
      </td>
      <td className="px-4 py-3 text-right font-mono text-gray-300">
        {section.sgstPaise !== undefined ? fmt(section.sgstPaise) : "—"}
      </td>
      <td className="px-4 py-3 text-center">
        {section.totalPayablePaise !== undefined && (
          <button
            onClick={() => copy(key, section.totalPayablePaise)}
            className="text-xs text-cyan-400/70 hover:text-cyan-400"
          >
            {copied === key ? "✓" : "Copy"}
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-mono text-xl tracking-tight">📊 {periodLabel} Report</h1>
          <Link href="/retail" className="text-xs text-gray-500 hover:text-gray-300">← Dashboard</Link>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
          {(["summary", "gstr1", "gstr3b"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-md py-2 text-xs uppercase tracking-wider transition-all ${tab === t ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}>
              {t === "summary" ? "Summary" : t === "gstr1" ? "GSTR-1" : "GSTR-3B"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 animate-pulse">Loading report data...</div>
        ) : (
          <>
            {/* Summary Tab */}
            {tab === "summary" && gstr3b && (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(gstr3b).map(([key, section]) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const s = section as any;
                  return (
                    <div key={key} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                      <h3 className="text-[10px] uppercase text-gray-500 tracking-widest">{s.label}</h3>
                      {s.taxablePaise !== undefined && (
                        <p className="text-lg font-mono text-gray-200 mt-1">{fmt(s.taxablePaise)}</p>
                      )}
                      {s.totalPayablePaise !== undefined && (
                        <p className="text-lg font-mono text-red-400 mt-1">{fmt(s.totalPayablePaise)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* GSTR-1 Tab */}
            {tab === "gstr1" && gstr1 && (
              <div className="space-y-6">
                {/* B2C Consolidated */}
                <div>
                  <h3 className="text-xs uppercase text-gray-500 tracking-widest mb-2">B2C Consolidated</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900/80 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Rate</th>
                          <th className="px-4 py-2 text-right">Taxable</th>
                          <th className="px-4 py-2 text-right">CGST</th>
                          <th className="px-4 py-2 text-right">SGST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {((gstr1 as any).b2cConsolidated || []).map((row: any, i: number) => (
                          <tr key={i} className="border-t border-gray-800/50">
                            <td className="px-4 py-2 text-gray-400">{row.gstRate}%</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-200">{fmt(row.taxablePaise)}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-400">{fmt(row.cgstPaise)}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-400">{fmt(row.sgstPaise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* HSN Summary */}
                <div>
                  <h3 className="text-xs uppercase text-gray-500 tracking-widest mb-2">HSN Summary</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900/80 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2 text-left">HSN</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-right">Qty</th>
                          <th className="px-4 py-2 text-right">Taxable</th>
                          <th className="px-4 py-2 text-right">Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {((gstr1 as any).hsnSummary || []).map((row: any, i: number) => (
                          <tr key={i} className="border-t border-gray-800/50">
                            <td className="px-4 py-2 text-gray-400 font-mono">{row.hsnCode}</td>
                            <td className="px-4 py-2 text-gray-200 max-w-[200px] truncate">{row.description}</td>
                            <td className="px-4 py-2 text-right text-gray-400">{row.quantity}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-200">{fmt(row.taxablePaise)}</td>
                            <td className="px-4 py-2 text-right font-mono text-gray-400">{fmt(row.totalTaxPaise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* GSTR-3B Tab */}
            {tab === "gstr3b" && gstr3b && (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-900/80 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Section</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-right">IGST</th>
                      <th className="px-4 py-3 text-right">CGST</th>
                      <th className="px-4 py-3 text-right">SGST</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {Object.entries(gstr3b).map(([key, section]) => renderGSTR3BRow(key, section))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
