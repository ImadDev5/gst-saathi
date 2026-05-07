"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import ITCBadge from "@/components/ITCBadge";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  itc_status: string;
  block_reason: string | null;
  mapped_vendor_name: string | null;
  action_required?: string | null;
  confidence?: number | null;
  rcm_type?: string | null;
}

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: "ELIGIBLE", label: "Eligible" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "RCM", label: "RCM" },
  { value: "CONDITIONAL", label: "Conditional" },
  { value: "UNKNOWN", label: "Unknown" },
];

export default function OverridePanel({ transaction, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState(transaction?.itc_status || "UNKNOWN");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (!transaction) return null;

  const handleSave = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for the override");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itc_status: newStatus,
          override_reason: reason,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Failed to save");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!transaction} onOpenChange={handleOpenChange}>
      <SheetContent className="bg-white border-slate-200 overflow-y-auto w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-slate-900">Override Classification</SheetTitle>
          <SheetDescription className="text-slate-500">
            Change the ITC status for this transaction
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4 space-y-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Narration</span>
                <p className="text-sm text-slate-900 mt-0.5">{transaction.description}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Amount</span>
                  <p className="text-sm text-slate-900 mt-0.5 font-mono tabular-nums">
                    ₹{(transaction.amount / 100).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Vendor</span>
                  <p className="text-sm text-slate-900 mt-0.5">
                    {transaction.mapped_vendor_name || "Unmatched"}
                  </p>
                </div>
              </div>
              {transaction.block_reason && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Current Reason</span>
                  <p className="text-sm text-red-700 mt-0.5">{transaction.block_reason}</p>
                </div>
              )}
              {transaction.action_required && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Action Required</span>
                  <p className="text-sm text-amber-700 mt-0.5">{transaction.action_required}</p>
                </div>
              )}
              {transaction.confidence != null && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Engine Confidence</span>
                  <p className="text-sm text-slate-900 mt-0.5 font-mono tabular-nums">
                    {(transaction.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              )}
              {transaction.rcm_type && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">RCM Type</span>
                  <p className="text-sm text-slate-900 mt-0.5 font-mono">{transaction.rcm_type}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-3 block">
              New ITC Status
            </Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    newStatus === opt.value
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="itc_status"
                    value={opt.value}
                    checked={newStatus === opt.value}
                    onChange={() => setNewStatus(opt.value)}
                    className="hidden"
                  />
                  <ITCBadge status={opt.value} />
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2 block">
              Reason for Override
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Verified B2B invoice received from vendor"
              rows={3}
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-900"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
            >
              {saving ? "Saving..." : "Save Override"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}