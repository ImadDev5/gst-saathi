"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const GST_RATES = [0, 5, 12, 18, 28];

export default function NewEntryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultType = searchParams.get("type") || "SALE";

  const [form, setForm] = useState({
    entry_type: defaultType,
    entry_date: new Date().toISOString().split("T")[0],
    payment_mode: "CASH",
    customer_type: "B2C",
    party_name: "",
    party_gstin: "",
    product_name: "",
    hsn_code: "",
    quantity: 1,
    unit: "pcs",
    rate_paise: 0,
    gst_rate: 18,
    remarks: "",
  });

  const [rateRupees, setRateRupees] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thresholdWarning, setThresholdWarning] = useState<string | null>(null);
  const [products, setProducts] = useState<{ id: string; product_name: string; default_gst_rate: number; hsn_sac_code: string }[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  // Fetch products for typeahead
  useEffect(() => {
    if (form.product_name.length >= 2) {
      fetch(`/api/v1/products?q=${encodeURIComponent(form.product_name)}&limit=5`)
        .then(r => r.json())
        .then(json => { if (json.success) setProducts(json.data); setShowProducts(true); });
    } else {
      setShowProducts(false);
    }
  }, [form.product_name]);

  const ratePaise = Math.round(parseFloat(rateRupees || "0") * 100);
  const taxable = Math.round(form.quantity * ratePaise);
  const gstAmount = Math.round(taxable * form.gst_rate / 100);
  const total = taxable + gstAmount;

  // Threshold warning (garments etc.)
  useEffect(() => {
    if (ratePaise > 90000 && ratePaise < 110000) {
      setThresholdWarning(`Price is near ₹1,000 threshold — GST rate changes from 5% to 12%`);
    } else {
      setThresholdWarning(null);
    }
  }, [ratePaise]);

  const handleSubmit = async () => {
    if (!form.product_name || !rateRupees) {
      setError("Product name and rate are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/v1/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rate_paise: ratePaise,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to save");
        return;
      }

      if (json.thresholdWarning) setThresholdWarning(json.thresholdWarning);

      router.push("/retail/ledger");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const isSale = form.entry_type === "SALE" || form.entry_type === "SALE_RETURN";

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-mono text-xl tracking-tight">
            {isSale ? "💰" : "🛒"} New {form.entry_type.replace("_", " ").toLowerCase()}
          </h1>
          <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
        </header>

        {/* Entry type toggle */}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-900 p-1">
          {["SALE", "PURCHASE", "SALE_RETURN", "PURCHASE_RETURN"].map(t => (
            <button key={t} onClick={() => setForm(f => ({ ...f, entry_type: t }))}
              className={`rounded-md py-2 text-xs transition-all ${form.entry_type === t ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}>
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Date + Payment mode */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Date</label>
            <input type="date" value={form.entry_date}
              onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Payment</label>
            <select value={form.payment_mode}
              onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>

        {/* Product name with typeahead */}
        <div className="relative">
          <label className="text-xs text-gray-500 uppercase mb-1 block">Product Name</label>
          <input type="text" value={form.product_name}
            onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))}
            placeholder="Start typing..."
            className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          {showProducts && products.length > 0 && (
            <div className="absolute z-10 w-full mt-1 rounded-lg border border-gray-800 bg-gray-950 shadow-xl overflow-hidden">
              {products.map(p => (
                <button key={p.id} onClick={() => {
                  setForm(f => ({ ...f, product_name: p.product_name, gst_rate: p.default_gst_rate, hsn_code: p.hsn_sac_code }));
                  setShowProducts(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-900 border-b border-gray-900 last:border-0">
                  {p.product_name} <span className="text-gray-600 text-xs">{p.default_gst_rate}%</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quantity, Rate, GST Rate */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Qty</label>
            <input type="number" min={0.001} step="any" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Rate (₹)</label>
            <input type="number" min={0} step="any" value={rateRupees}
              onChange={e => setRateRupees(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">GST %</label>
            <select value={form.gst_rate}
              onChange={e => setForm(f => ({ ...f, gst_rate: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none">
              {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
        </div>

        {/* Threshold warning */}
        {thresholdWarning && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs text-yellow-400">
            ⚠️ {thresholdWarning}
          </div>
        )}

        {/* GST Calculation Preview */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Taxable</span>
            <span>₹{(taxable / 100).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>GST ({form.gst_rate}%)</span>
            <span>₹{(gstAmount / 100).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-white font-semibold border-t border-gray-800 pt-2">
            <span>Total</span>
            <span>₹{(total / 100).toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* B2B fields */}
        {form.customer_type === "B2B" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Party Name</label>
              <input type="text" value={form.party_name}
                onChange={e => setForm(f => ({ ...f, party_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Party GSTIN</label>
              <input type="text" value={form.party_gstin}
                onChange={e => setForm(f => ({ ...f, party_gstin: e.target.value.toUpperCase() }))}
                maxLength={15}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none" />
            </div>
          </div>
        )}

        {/* Customer type toggle */}
        <div className="flex gap-2">
          {["B2C", "B2B"].map(ct => (
            <button key={ct} onClick={() => setForm(f => ({ ...f, customer_type: ct }))}
              className={`flex-1 rounded-lg py-2 text-xs transition-all ${form.customer_type === ct ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
              {ct}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button onClick={handleSubmit} disabled={saving}
          className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : `Save ${form.entry_type.replace("_", " ")}`}
        </button>
      </div>
    </div>
  );
}
