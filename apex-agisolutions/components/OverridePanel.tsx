"use client";

import { useState } from "react";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  itc_status: string;
  block_reason: string | null;
  mapped_vendor_name: string | null;
}

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS = [
  { value: "ELIGIBLE", label: "✅ Eligible", color: "text-emerald-400" },
  { value: "BLOCKED", label: "🚫 Blocked", color: "text-red-400" },
  { value: "RCM", label: "🔄 RCM", color: "text-amber-400" },
  { value: "CONDITIONAL", label: "⚠️ Conditional", color: "text-orange-400" },
  { value: "UNKNOWN", label: "❓ Unknown", color: "text-gray-400" },
];

export default function OverridePanel({ transaction, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState(transaction?.itc_status || "UNKNOWN");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="h-full w-full max-w-md bg-gray-950 border-l border-gray-800 p-6 overflow-y-auto animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Override Classification</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Transaction info */}
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-4 mb-6 space-y-2">
          <div>
            <span className="text-xs text-gray-500 uppercase">Narration</span>
            <p className="text-sm text-gray-200 mt-0.5">{transaction.description}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-xs text-gray-500 uppercase">Amount</span>
              <p className="text-sm text-gray-200 mt-0.5 font-mono">
                ₹{(transaction.amount / 100).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase">Vendor</span>
              <p className="text-sm text-gray-200 mt-0.5">
                {transaction.mapped_vendor_name || "Unmatched"}
              </p>
            </div>
          </div>
          {transaction.block_reason && (
            <div>
              <span className="text-xs text-gray-500 uppercase">Current Reason</span>
              <p className="text-sm text-red-400 mt-0.5">{transaction.block_reason}</p>
            </div>
          )}
        </div>

        {/* New status */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
            New ITC Status
          </label>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                  newStatus === opt.value
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-gray-800 hover:border-gray-700"
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
                <span className={`text-sm ${opt.color}`}>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Reason */}
        <div className="mb-6">
          <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
            Reason for Override
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Verified B2B invoice received from vendor"
            rows={3}
            className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Override"}
          </button>
        </div>
      </div>
    </div>
  );
}
