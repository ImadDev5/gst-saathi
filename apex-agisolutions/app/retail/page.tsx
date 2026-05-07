"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ITCBadge from "@/components/ITCBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  ShoppingCart,
  BookOpen,
  FileBarChart,
  TrendingUp,
  ArrowUpRight,
  Receipt,
  Coins,
  IndianRupee,
} from "lucide-react";

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

export default function RetailDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard/retail-summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSummary(json.data);
        else setError("Failed to load dashboard data");
      })
      .catch(() => setError("Network error — check your connection"))
      .finally(() => setLoading(false));
  }, []);

  const currentPeriod = new Date().toISOString().substring(0, 7);

  const quickActions = [
    { href: "/retail/entry/new?type=SALE", icon: PlusCircle, label: "Record Sale" },
    { href: "/retail/entry/new?type=PURCHASE", icon: ShoppingCart, label: "Record Purchase" },
    { href: "/retail/ledger", icon: BookOpen, label: "Day Book" },
    { href: `/retail/reports/${currentPeriod}`, icon: FileBarChart, label: "Monthly Report" },
  ];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Summary</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Track your GST position across sales and purchases
            </p>
          </div>
          <Link href="/retail/ledger" className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors">
            View Day Book
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-red-700 text-sm">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
                className="mt-2 text-red-600 hover:text-red-700"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <CardTitle className="text-sm font-medium text-slate-500">
                  Today
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <MetricRow label="Sales" value={summary?.today.sales_paise || 0} icon={TrendingUp} />
                  <MetricRow label="Tax collected" value={summary?.today.gst_collected_paise || 0} icon={Receipt} />
                  <MetricRow label="Purchases" value={summary?.today.purchases_paise || 0} icon={ShoppingCart} />
                  <MetricRow label="Tax saved on purchases" value={summary?.today.itc_earned_paise || 0} icon={Coins} />
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <MetricRow
                      label="Net Position"
                      value={summary?.today.net_position_paise || 0}
                      highlight
                      icon={IndianRupee}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {summary?.today.entry_count || 0} entries today
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Month to Date
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-50 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <MetricRow label="Sales this month" value={summary?.mtd.sales_paise || 0} icon={TrendingUp} />
                  <MetricRow label="Tax collected" value={summary?.mtd.gst_collected_paise || 0} icon={Receipt} />
                  <MetricRow label="Purchases this month" value={summary?.mtd.purchases_paise || 0} icon={ShoppingCart} />
                  <MetricRow label="Tax saved on purchases" value={summary?.mtd.itc_earned_paise || 0} icon={Coins} />
                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <MetricRow
                      label="Net tax payable"
                      value={summary?.mtd.net_position_paise || 0}
                      highlight
                      icon={IndianRupee}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {summary?.mtd.entry_count || 0} entries MTD
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Tax by rate slab
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-6 bg-slate-100 rounded" />
                  ))}
                </div>
              ) : Object.keys(summary?.sales_by_rate_slab || {}).length === 0 ? (
                <p className="text-sm text-slate-400">No sales data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(summary?.sales_by_rate_slab || {})
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([rate, amount]) => {
                      const maxAmount = Math.max(...Object.values(summary?.sales_by_rate_slab || {}));
                      const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                      return (
                        <div key={rate} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600">
                              {rate}% GST
                            </span>
                            <span className="text-xs font-mono tabular-nums text-slate-900">{fmt(amount)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-slate-500 transition-all duration-150"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Tax credit breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-6 bg-slate-100 rounded" />
                  ))}
                </div>
              ) : Object.keys(summary?.itc_by_status || {}).length === 0 ? (
                <p className="text-sm text-slate-400">No purchase data yet</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(summary?.itc_by_status || {}).map(([status, amount]) => (
                    <div key={status} className="flex items-center justify-between">
                      <ITCBadge status={status} />
                      <span className="text-xs font-mono tabular-nums text-slate-900">{fmt(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer bg-white">
                  <CardContent className="p-4 text-center">
                    <Icon className="w-5 h-5 mx-auto mb-2 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  highlight,
  icon: Icon,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${
        highlight ? "bg-slate-50" : ""
      }`}
    >
      <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-medium">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className="text-sm font-mono font-semibold tabular-nums text-slate-900">{fmt(value)}</span>
    </div>
  );
}