"use client";

import { useState } from "react";

interface ITCResult {
  vendor: string | null;
  category: string;
  gst_rate: number;
  gst_amount_paise: number;
  itc_status: string;
  itc_status_label: string;
  block_reason: string | null;
  rcm_applicable: boolean;
  rcm_amount_paise?: number;
  action: string;
  confidence: number;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  ELIGIBLE:  { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  BLOCKED:   { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400" },
  RCM:       { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400" },
  UNKNOWN:   { bg: "bg-gray-500/10",    border: "border-gray-500/30",    text: "text-gray-400" },
};

export default function ITCCheckPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ITCResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheck = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/v1/itc/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expense_text: query }),
      });

      const json = await res.json();

      if (json.success) {
        setResult(json.data);
      } else {
        setError(json.error || "Something went wrong");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const colors = result ? STATUS_COLORS[result.itc_status] || STATUS_COLORS.UNKNOWN : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← gstsaathi.com</a>
          <h1 className="font-mono text-3xl mt-4 tracking-tight">
            ITC <span className="text-cyan-400">Checker</span>
          </h1>
          <p className="mt-2 text-gray-400 text-sm max-w-md mx-auto">
            Instantly check if your business expense qualifies for Input Tax Credit under GST
          </p>
          <p className="text-xs text-gray-600 mt-1">Free • No login required • 5 checks per day</p>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder='e.g. "Google Ads ₹45,000" or "Swiggy ₹850"'
            className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500 focus:outline-none"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !query.trim()}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors disabled:opacity-30 whitespace-nowrap"
          >
            {loading ? "Checking..." : "Check ITC"}
          </button>
        </div>

        {/* Quick examples */}
        <div className="flex flex-wrap gap-2 mt-3">
          {["Adobe CC ₹5,664", "Swiggy ₹850", "Google Ads ₹45,000", "Office Rent ₹50,000", "Airtel ₹999"].map((ex) => (
            <button
              key={ex}
              onClick={() => { setQuery(ex); }}
              className="rounded-full border border-gray-800 px-3 py-1 text-xs text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && colors && (
          <div className={`mt-8 rounded-xl border ${colors.border} ${colors.bg} p-6 space-y-4 animate-in fade-in duration-300`}>
            {/* Status banner */}
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-lg font-semibold ${colors.text}`}>
                  {result.itc_status === "ELIGIBLE" && "✅ "}
                  {result.itc_status === "BLOCKED" && "🚫 "}
                  {result.itc_status === "RCM" && "🔄 "}
                  {result.itc_status === "UNKNOWN" && "❓ "}
                  {result.itc_status_label}
                </span>
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {result.vendor && (
                <div>
                  <span className="text-xs text-gray-500">Vendor</span>
                  <p className="text-gray-200">{result.vendor}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">Category</span>
                <p className="text-gray-200">{result.category}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">GST Rate</span>
                <p className="text-gray-200">{result.gst_rate}%</p>
              </div>
              {result.gst_amount_paise > 0 && (
                <div>
                  <span className="text-xs text-gray-500">
                    {result.rcm_applicable ? "RCM Tax Payable" : "GST Component"}
                  </span>
                  <p className={`font-mono ${colors.text}`}>
                    ₹{(result.gst_amount_paise / 100).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>

            {/* Block reason */}
            {result.block_reason && (
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                <p className="text-xs text-red-400">{result.block_reason}</p>
              </div>
            )}

            {/* Action */}
            <div className="rounded-lg bg-gray-900/50 border border-gray-800 p-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Recommended Action</span>
              <p className="text-sm text-gray-300 mt-1">{result.action}</p>
            </div>

            {/* CTA */}
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500 text-center">
                Want detailed analysis of all your expenses?{" "}
                <a href="/" className="text-cyan-400 hover:underline">Upload your bank statement →</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
