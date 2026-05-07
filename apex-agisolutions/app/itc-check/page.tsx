"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search, Loader2, ShieldCheck, ShieldX, RefreshCw, Sparkles } from "lucide-react";
import ITCBadge from "@/components/ITCBadge";

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

const STATUS_ICONS: Record<string, React.ElementType> = {
  ELIGIBLE: ShieldCheck,
  BLOCKED: ShieldX,
  RCM: RefreshCw,
  UNKNOWN: Sparkles,
};

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  ELIGIBLE: { bg: "bg-slate-50", border: "border-slate-200" },
  BLOCKED: { bg: "bg-slate-50", border: "border-slate-200" },
  RCM: { bg: "bg-slate-50", border: "border-slate-200" },
  UNKNOWN: { bg: "bg-slate-50", border: "border-slate-200" },
};

const EXAMPLES = ["Adobe CC ₹5,664", "Swiggy ₹850", "Google Ads ₹45,000", "Office Rent ₹50,000", "Airtel ₹999"];

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
  const Icon = result ? STATUS_ICONS[result.itc_status] || STATUS_ICONS.UNKNOWN : null;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-center mb-10">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-900 transition-colors inline-flex items-center gap-1">
            &larr; TaxApex
          </Link>
          <h1 className="text-3xl mt-4 font-bold tracking-tight text-slate-900">
            Tax <span className="text-slate-900">Saver</span>
          </h1>
          <p className="mt-2 text-slate-500 text-sm max-w-md mx-auto">
            Check if you can claim tax back on any business expense
          </p>
          <p className="text-xs text-slate-400 mt-1">Free &middot; No login required &middot; 5 checks per day</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              placeholder='e.g. "Google Ads ₹45,000" or "Swiggy ₹850"'
              className="pl-10 bg-white border-slate-200 h-11"
              autoFocus
            />
          </div>
          <Button
            onClick={handleCheck}
            disabled={loading || !query.trim()}
            className="bg-slate-900 text-white hover:bg-slate-800 h-11"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Check tax"
            )}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors bg-white"
            >
              {ex}
            </button>
          ))}
        </div>

        {error && (
          <Card className="mt-6 border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">
              {error}
            </CardContent>
          </Card>
        )}

        {result && colors && Icon && (
          <div className="mt-8">
            <Card className={`border ${colors.border} ${colors.bg} shadow-sm`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <ITCBadge status={result.itc_status} />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums font-mono">
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {result.vendor && (
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Vendor</span>
                      <p className="text-slate-900 mt-0.5">{result.vendor}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Category</span>
                    <p className="text-slate-900 mt-0.5">{result.category}</p>
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Tax rate</span>
                    <p className="text-slate-900 mt-0.5">{result.gst_rate}%</p>
                  </div>
                  {result.gst_amount_paise > 0 && (
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                        {result.rcm_applicable ? "Tax you must pay" : "Tax"}
                      </span>
                      <p className="font-mono mt-0.5 tabular-nums text-slate-900">
                        ₹{(result.gst_amount_paise / 100).toLocaleString("en-IN")}
                      </p>
                    </div>
                  )}
                </div>

                {result.block_reason && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-3">
                      <p className="text-xs text-red-700">{result.block_reason}</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-slate-200 bg-white">
                  <CardContent className="p-3">
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">What to do</span>
                    <p className="text-sm text-slate-900 mt-1">{result.action}</p>
                  </CardContent>
                </Card>

                <Separator className="bg-slate-200" />

                <p className="text-xs text-slate-400 text-center">
                  Want detailed analysis of all your expenses?{" "}
                  <a href="/" className="text-slate-900 hover:underline">
                    Upload your bank statement &rarr;
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}