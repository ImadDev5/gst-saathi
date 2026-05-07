"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ITCBadge from "@/components/ITCBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, PlusCircle, ShoppingCart, Pencil, Trash2, Lock, Paperclip } from "lucide-react";

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

const TYPE_STYLES: Record<string, string> = {
  SALE: "bg-slate-100 text-slate-700",
  PURCHASE: "bg-slate-100 text-slate-700",
  SALE_RETURN: "bg-slate-100 text-slate-700",
  PURCHASE_RETURN: "bg-slate-100 text-slate-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  CASH: "bg-slate-100 text-slate-700",
  ONLINE: "bg-slate-100 text-slate-700",
  CREDIT: "bg-slate-100 text-slate-700",
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
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Day Book</h1>
            <p className="text-sm text-slate-500 mt-0.5">All your sales and purchases</p>
          </div>
          <div className="flex gap-2">
            <Link href="/retail/entry/new?type=SALE" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors h-8">
              <PlusCircle className="w-3.5 h-3.5" />
              Sale
            </Link>
            <Link href="/retail/entry/new?type=PURCHASE" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors h-8">
              <ShoppingCart className="w-3.5 h-3.5" />
              Purchase
            </Link>
            <Link href="/retail" className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors h-8">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {["", "SALE", "PURCHASE", "SALE_RETURN", "PURCHASE_RETURN"].map((t) => {
            const labels: Record<string, string> = {
              "": "All",
              SALE: "Sale",
              PURCHASE: "Purchase",
              SALE_RETURN: "Return",
              PURCHASE_RETURN: "Return",
            };
            return (
              <Button
                key={t}
                variant={filter === t ? "default" : "ghost"}
                size="sm"
                onClick={() => { setFilter(t); setPage(1); }}
                className={
                  filter === t
                    ? "bg-slate-900 text-white hover:bg-slate-800 rounded-full h-7 text-xs"
                    : "rounded-full h-7 text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                }
              >
                {labels[t]}
              </Button>
            );
          })}
          <span className="ml-auto text-xs text-slate-400 tabular-nums">{total} entries</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg" />
                ))}
              </div>
            </div>
          ) : entries.length === 0 ? (
            <Card className="shadow-sm border-slate-200">
              <CardContent className="p-12 text-center text-slate-400">
                No entries yet. Add your first sale or purchase to get started.
              </CardContent>
            </Card>
          ) : (
            entries.map((e) => (
              <Collapsible
                key={e.id}
                open={expandedId === e.id}
                onOpenChange={(open) => setExpandedId(open ? e.id : null)}
              >
                <Card className="shadow-sm border-slate-200 overflow-hidden">
                  <CollapsibleTrigger>
                    <div className="w-full text-left">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TYPE_STYLES[e.entry_type] || "bg-slate-100 text-slate-700"}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {(() => {
                            const labels: Record<string, string> = {
                              SALE: "Sale",
                              PURCHASE: "Purchase",
                              SALE_RETURN: "Sale Return",
                              PURCHASE_RETURN: "Purchase Return",
                            };
                            return labels[e.entry_type] || e.entry_type;
                          })()}
                        </span>

                        <span className="text-xs text-slate-500 w-20 tabular-nums">
                          {new Date(e.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </span>

                        <span className="text-sm text-slate-900 truncate flex-1">
                          {e.entry_line_items?.slice(0, 3).map((li) => li.product_name).join(", ")}
                          {(e.entry_line_items?.length || 0) > 3 && <span className="text-slate-400"> +{e.entry_line_items.length - 3} more</span>}
                        </span>

                        <span className="font-mono text-sm text-slate-900 shrink-0 tabular-nums">{fmt(e.computed?.total_paise || 0)}</span>

                        {isPurchase(e.entry_type) && (
                          <ITCBadge status={e.entry_line_items?.[0]?.itc_status || "UNKNOWN"} />
                        )}

                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${PAYMENT_STYLES[e.payment_mode] || "bg-slate-100 text-slate-700"}`}>
                          {e.payment_mode}
                        </span>

                        {e.has_invoice && (
                          <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}

                        <div className="flex items-center gap-1 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                          {!e.period_locked ? (
                            <>
                              <Link href={`/retail/entry/${e.id}/edit`} className="inline-flex items-center justify-center h-7 w-7 p-0 text-slate-400 hover:text-slate-900 rounded-md transition-colors">
                                <Pencil className="w-3 h-3" />
                              </Link>
                              <button className="inline-flex items-center justify-center h-7 w-7 p-0 text-slate-400 hover:text-red-600 rounded-md transition-colors" onClick={() => handleDelete(e.id)}>
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <Link href={`/retail/entry/${e.id}/edit`} className="inline-flex items-center justify-center h-7 w-7 p-0 text-slate-300 hover:text-slate-900 rounded-md transition-colors" title="View/Amend">
                                <Pencil className="w-3 h-3" />
                              </Link>
                              <Lock className="w-3 h-3 text-slate-300" />
                            </>
                          )}
                        </div>

                        {expandedId === e.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500 uppercase border-b border-slate-200">
                            <th className="py-1.5 text-left font-medium">Product</th>
                            <th className="py-1.5 text-right font-medium">Qty</th>
                            <th className="py-1.5 text-right font-medium">Rate</th>
                            <th className="py-1.5 text-right font-medium">Before tax</th>
                            <th className="py-1.5 text-right font-medium">Tax</th>
                            <th className="py-1.5 text-right font-medium">Total</th>
                            {isPurchase(e.entry_type) && (
                              <>
                                <th className="py-1.5 text-center font-medium">Credit</th>
                                <th className="py-1.5 text-right font-medium">Credit amt</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(e.entry_line_items || []).map((li) => (
                            <tr key={li.id} className="border-b border-slate-100">
                              <td className="py-1.5 text-slate-900">{li.product_name}</td>
                              <td className="py-1.5 text-right text-slate-500 font-mono tabular-nums">{li.quantity}</td>
                              <td className="py-1.5 text-right text-slate-500 font-mono tabular-nums">{fmt(li.rate_paise)}</td>
                              <td className="py-1.5 text-right text-slate-500 font-mono tabular-nums">
                                {fmt(li.total_paise - li.gst_rate ? Math.round(li.total_paise * 100 / (100 + li.gst_rate)) : li.total_paise)}
                              </td>
                              <td className="py-1.5 text-right text-slate-500 font-mono tabular-nums">{li.gst_rate}%</td>
                              <td className="py-1.5 text-right text-slate-900 font-mono tabular-nums font-medium">{fmt(li.total_paise)}</td>
                              {isPurchase(e.entry_type) && (
                                <>
                                  <td className="py-1.5 text-center"><ITCBadge status={li.itc_status} /></td>
                                  <td className="py-1.5 text-right text-slate-900 font-mono tabular-nums">{fmt(li.itc_amount_paise)}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="mt-3 flex gap-4 text-[11px] text-slate-500">
                        {e.party_name && <span>Party: {e.party_name}</span>}
                        {e.party_gstin && <span>GST: {e.party_gstin}</span>}
                        {e.invoice_number && <span>Invoice: {e.invoice_number}</span>}
                        {e.customer_type && <span>{e.customer_type}</span>}
                        {e.period_locked && <span className="text-red-600">Period Filed</span>}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="text-xs">
              Prev
            </Button>
            <span className="text-xs text-slate-500 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="text-xs">
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}