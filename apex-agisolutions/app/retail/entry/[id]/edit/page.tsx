"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

const GST_RATES = [0, 5, 12, 18, 28];

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function EditEntryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [header, setHeader] = useState<any>({});
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [periodLocked, setPeriodLocked] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const res = await fetch(`/api/v1/entries?per_page=100`);
      const json = await res.json();
      if (!json.success) {
        setFetchError("Failed to load");
        setLoading(false);
        return;
      }
      const entry = json.data?.find((e: any) => e.id === id);
      if (!entry) {
        setFetchError("Entry not found");
        setLoading(false);
        return;
      }
      setHeader({
        entry_type: entry.entry_type,
        entry_date: entry.entry_date,
        payment_mode: entry.payment_mode,
        customer_type: entry.customer_type,
        party_name: entry.party_name || "",
        party_gstin: entry.party_gstin || "",
        invoice_number: entry.invoice_number || "",
        remarks: entry.remarks || "",
      });
      setPeriodLocked(entry.period_locked);
      setLineItems(
        (entry.entry_line_items || []).map((li: any) => ({
          product_id: li.product_id || "",
          product_name: li.product_name,
          hsn_code: li.hsn_code || "",
          quantity: li.quantity,
          unit: li.unit || "pcs",
          rate_rupees: (li.rate_paise || 0) / 100,
          gst_rate: li.gst_rate,
          is_price_sensitive: li.is_price_sensitive || false,
          threshold_paise: li.threshold_paise || 100000,
          product_category: null,
        }))
      );
      setLoading(false);
    }
    load();
  }, [id]);

  const updateLineItem = (idx: number, updates: any) => {
    setLineItems((prev: any[]) => prev.map((li: any, i: number) => i === idx ? { ...li, ...updates } : li));
  };

  const addLineItem = () => {
    setLineItems((prev: any[]) => [
      ...prev,
      { product_id: "", product_name: "", hsn_code: "", quantity: 1, unit: "pcs", rate_rupees: 0, gst_rate: 18, is_price_sensitive: false, threshold_paise: 100000, product_category: null },
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev: any[]) => prev.filter((_: any, i: number) => i !== idx));
  };

  const calcGstPreview = (li: any) => {
    const ratePaise = Math.round(li.rate_rupees * 100);
    const amountPaise = Math.round(li.quantity * ratePaise);
    const taxable = Math.round(amountPaise * 100 / (100 + li.gst_rate));
    const gst = amountPaise - taxable;
    return { ratePaise, amountPaise, taxable, gst };
  };

  const totalPaise = lineItems.reduce((s: number, li: any) => s + calcGstPreview(li).amountPaise, 0);
  const totalGstPaise = lineItems.reduce((s: number, li: any) => s + calcGstPreview(li).gst, 0);
  const isPurchase = header.entry_type === "PURCHASE" || header.entry_type === "PURCHASE_RETURN";

  const handleSubmit = async () => {
    setSaving(true);
    setError("");

    try {
      const body = {
        ...header,
        line_items: lineItems.map((li: any) => ({
          product_id: li.product_id || null,
          product_name: li.product_name,
          hsn_code: li.hsn_code || null,
          quantity: li.quantity,
          unit: li.unit,
          rate_paise: Math.round(li.rate_rupees * 100),
          gst_rate: li.gst_rate,
          is_price_sensitive: li.is_price_sensitive,
          threshold_paise: li.threshold_paise,
          product_category: li.product_category,
        })),
      };

      const res = await fetch(`/api/v1/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 423) {
          // Period locked — offer amendment
          setError("Period is filed. Create an amendment instead?");
          setWarnings([]);
        } else {
          setError(json.error || "Failed to save");
        }
        return;
      }

      if (json.warnings?.length > 0) setWarnings(json.warnings);
      router.push("/retail/ledger");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleAmend = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/entries/${id}/amend`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        router.push("/retail/ledger");
      } else {
        setError(json.error);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500">Loading...</div>;
  if (fetchError) return <div className="min-h-screen bg-black flex items-center justify-center text-red-400">{fetchError}</div>;

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-mono text-xl tracking-tight">✏️ Edit Entry</h1>
          <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
        </header>

        {periodLocked && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-red-300">This entry is from a filed period. Changes may require an amendment.</span>
          </div>
        )}

        {/* Header fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Date</label>
            <input type="date" value={header.entry_date}
              onChange={e => setHeader((h: any) => ({ ...h, entry_date: e.target.value }))}
              disabled={periodLocked}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Payment</label>
            <select value={header.payment_mode}
              onChange={e => setHeader((h: any) => ({ ...h, payment_mode: e.target.value }))}
              disabled={periodLocked}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>

        {header.customer_type === "B2B" && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Party Name</label>
              <input type="text" value={header.party_name}
                onChange={e => setHeader((h: any) => ({ ...h, party_name: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Party GSTIN</label>
              <input type="text" value={header.party_gstin}
                onChange={e => setHeader((h: any) => ({ ...h, party_gstin: e.target.value.toUpperCase() }))}
                maxLength={15}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase mb-1 block">Invoice #</label>
              <input type="text" value={header.invoice_number}
                onChange={e => setHeader((h: any) => ({ ...h, invoice_number: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white" />
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">Line Items</h2>
            {!periodLocked && (
              <button onClick={addLineItem}
                className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 border border-gray-700">
                <Plus className="w-3 h-3" /> Add Item
              </button>
            )}
          </div>

          {lineItems.map((li: any, idx: number) => {
            const gst = calcGstPreview(li);
            return (
              <div key={idx} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-mono">Item {idx + 1}</span>
                  {!periodLocked && lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(idx)} className="text-gray-600 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 uppercase mb-1 block">Product</label>
                  <input type="text" value={li.product_name}
                    onChange={e => updateLineItem(idx, { product_name: e.target.value })}
                    disabled={periodLocked}
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase mb-1 block">Qty</label>
                    <input type="number" min={0.001} step="any" value={li.quantity || ""}
                      onChange={e => updateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      disabled={periodLocked}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase mb-1 block">Rate (₹)</label>
                    <input type="number" min={0} step="any" value={li.rate_rupees || ""}
                      onChange={e => updateLineItem(idx, { rate_rupees: parseFloat(e.target.value) || 0 })}
                      disabled={periodLocked}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase mb-1 block">GST%</label>
                    <select value={li.gst_rate}
                      onChange={e => updateLineItem(idx, { gst_rate: Number(e.target.value) })}
                      disabled={periodLocked}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50">
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-gray-600">Taxable:</span>
                  <span className="text-gray-400">{fmt(gst.taxable)}</span>
                  <span className="text-gray-600 ml-2">GST:</span>
                  <span className="text-gray-400">{fmt(gst.gst)}</span>
                  <span className="text-gray-600 ml-2">Total:</span>
                  <span className="text-white">{fmt(gst.amountPaise)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand total */}
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between text-white font-semibold border-t border-cyan-500/20 pt-2">
            <span>Grand Total</span>
            <span>{fmt(totalPaise)}</span>
          </div>
          {isPurchase && (
            <div className="flex justify-between text-emerald-400 border-t border-emerald-500/20 pt-2">
              <span>Estimated ITC</span>
              <span>{fmt(totalGstPaise)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
            {error}
            {periodLocked && (
              <button onClick={handleAmend} className="ml-2 text-cyan-400 hover:underline">
                Create amendment instead →
              </button>
            )}
          </div>
        )}

        {!periodLocked && (
          <button onClick={handleSubmit} disabled={saving}
            className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Update Entry"}
          </button>
        )}
      </div>
    </div>
  );
}
