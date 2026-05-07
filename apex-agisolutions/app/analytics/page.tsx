"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Summary {
  totalEligiblePaise: number;
  totalBlockedPaise: number;
  totalAtRiskPaise: number;
  totalRcmPaise: number;
  totalNeedsInvoicePaise: number;
  totalUnknownPaise: number;
  totalTransactions: number;
  statementCount: number;
}

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

const BAR_COLORS = ["#4F46E5", "#EF4444", "#F59E0B"];
const PIE_COLORS = ["#4F46E5", "#EF4444", "#F59E0B", "#8B5CF6", "#10B981", "#64748B"];

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/dashboard/summary")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSummary(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const barData = summary
    ? [
        { name: "Tax saved", amount: summary.totalEligiblePaise },
        { name: "Can't claim", amount: summary.totalBlockedPaise + summary.totalAtRiskPaise },
        { name: "You must pay", amount: summary.totalRcmPaise },
      ]
    : [];

  const pieData = summary
    ? [
        { name: "Tax saved", value: summary.totalEligiblePaise },
        { name: "Can't claim", value: summary.totalBlockedPaise },
        { name: "At risk", value: summary.totalAtRiskPaise },
        { name: "You must pay", value: summary.totalRcmPaise },
        { name: "Needs bill", value: summary.totalNeedsInvoicePaise },
        { name: "Unclear", value: summary.totalUnknownPaise },
      ].filter((d) => d.value > 0)
    : [];

  const metrics = summary
    ? [
        { label: "Total Transactions", value: summary.totalTransactions, icon: Activity },
        { label: "Statements", value: summary.statementCount, icon: BarChart3 },
        { label: "Tax saved", value: formatPaise(summary.totalEligiblePaise), icon: TrendingUp },
        { label: "Can't claim", value: formatPaise(summary.totalBlockedPaise + summary.totalAtRiskPaise), icon: TrendingDown },
      ]
    : [];

  return (
    <div className="p-6">
      <div className="mx-auto max-w-[1280px] space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            See how much tax you can claim back and where you&apos;re losing out
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-5">
                  <div className="h-3 w-16 bg-slate-100 rounded mb-3 animate-pulse" />
                  <div className="h-7 w-20 bg-slate-50 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.label} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                        {m.label}
                      </h2>
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                      {m.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Tax position
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.03)" }}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        color: "#1E293B",
                        fontSize: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value) => [formatPaise(Number(value)), "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {barData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Tax breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "8px",
                        color: "#1E293B",
                        fontSize: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                      formatter={(value) => [formatPaise(Number(value)), ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-slate-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}