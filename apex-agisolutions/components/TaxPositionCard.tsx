"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";

interface TaxPositionCardProps {
  /** Total tax collected from sales (CGST+SGST+IGST collected) in paise */
  taxCollectedPaise: number;
  /** Total ITC/tax saved (eligible credits) in paise */
  taxSavedPaise: number;
  /** RCM tax the user must pay in paise */
  rcmPayablePaise?: number;
  /** Filing due date, e.g. "20 April" */
  dueDate?: string;
  /** Click handler for the primary action */
  onFileNow?: () => void;
  /** Primary action label */
  actionLabel?: string;
  /** Label for the card */
  title?: string;
}

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

/**
 * TaxPositionCard — a single glanceable card that answers "how much do I owe?"
 * Green = you get money back, Red = you owe money.
 */
export default function TaxPositionCard({
  taxCollectedPaise,
  taxSavedPaise,
  rcmPayablePaise = 0,
  dueDate,
  onFileNow,
  actionLabel = "File Now",
  title = "Your Tax Position",
}: TaxPositionCardProps) {
  const netPayable = taxCollectedPaise - taxSavedPaise + rcmPayablePaise;
  const isRefund = netPayable < 0;

  return (
    <Card className={isRefund ? "border-emerald-200" : "border-rose-200"}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  isRefund ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isRefund ? fmt(Math.abs(netPayable)) : fmt(netPayable)}
              </span>
              <span className={`text-sm font-medium ${isRefund ? "text-emerald-500" : "text-rose-500"}`}>
                {isRefund ? "coming back to you" : "to pay"}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            isRefund ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
          }`}>
            {isRefund ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            {isRefund ? "Refund" : "Payable"}
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">Tax on sales</p>
            <p className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(taxCollectedPaise)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">Tax saved</p>
            <p className="text-sm font-semibold text-emerald-600 tabular-nums">−{fmt(taxSavedPaise)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500">You must pay</p>
            <p className="text-sm font-semibold text-rose-600 tabular-nums">{rcmPayablePaise > 0 ? `+${fmt(rcmPayablePaise)}` : fmt(0)}</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
          {dueDate ? (
            <p className="text-xs text-slate-500">
              Due by <span className="font-medium text-slate-700">{dueDate}</span>
            </p>
          ) : (
            <div />
          )}
          {onFileNow && (
            <Button size="sm" onClick={onFileNow} className="gap-1">
              {actionLabel}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
