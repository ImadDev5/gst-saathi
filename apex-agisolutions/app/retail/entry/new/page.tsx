"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import InvoiceDropzone from "@/components/InvoiceDropzone";
import ITCBadge from "@/components/ITCBadge";

const GST_RATES = [0, 5, 12, 18, 28];

interface LineItemForm {
  product_id: string;
  product_name: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  rate_rupees: number;     // user enters in rupees
  gst_rate: number;
  is_price_sensitive: boolean;
  threshold_paise: number;
  product_category: string | null;
}

interface ProductInfo {
  id: string;
  product_name: string;
  default_gst_rate: number;
  hsn_sac_code: string;
  is_price_sensitive: boolean;
  threshold_paise: number;
  category: string | null;
}

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function NewEntryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultType = searchParams.get("type") || "SALE";

  const [header, setHeader] = useState({
    entry_type: defaultType,
    entry_date: new Date().toISOString().split("T")[0],
    payment_mode: "CASH",
    customer_type: "B2C",
    party_name: "",
    party_gstin: "",
    invoice_number: "",
    remarks: "",
  });

  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { product_id: "", product_name: "", hsn_code: "", quantity: 1, unit: "pcs", rate_rupees: 0, gst_rate: 18, is_price_sensitive: false, threshold_paise: 100000, product_category: null },
  ]);

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [showProducts, setShowProducts] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const isPurchase = header.entry_type === "PURCHASE" || header.entry_type === "PURCHASE_RETURN";

  // Fetch products for typeahead
  useEffect(() => {
    const idx = showProducts;
    if (idx !== null && productSearch.length >= 2) {
      fetch(`/api/v1/products?q=${encodeURIComponent(productSearch)}&limit=5`)
        .then(r => r.json())
        .then(json => { if (json.success) setProducts(json.data); });
    } else {
      setProducts([]);
    }
  }, [productSearch, showProducts]);

  const updateLineItem = useCallback((idx: number, updates: Partial<LineItemForm>) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, ...updates } : li));
  }, []);

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { product_id: "", product_name: "", hsn_code: "", quantity: 1, unit: "pcs", rate_rupees: 0, gst_rate: 18, is_price_sensitive: false, threshold_paise: 100000, product_category: null },
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Calculate GST preview for a line item (user enters GST-inclusive rate)
  const calcGstPreview = (li: LineItemForm) => {
    const ratePaise = Math.round(li.rate_rupees * 100);
    const amountPaise = Math.round(li.quantity * ratePaise);
    const taxable = Math.round(amountPaise * 100 / (100 + li.gst_rate));
    const gst = amountPaise - taxable;
    return { ratePaise, amountPaise, taxable, gst };
  };

  // Grand totals
  const totalPaise = lineItems.reduce((s, li) => s + calcGstPreview(li).amountPaise, 0);
  const totalGstPaise = lineItems.reduce((s, li) => s + calcGstPreview(li).gst, 0);
  const totalTaxable = lineItems.reduce((s, li) => s + calcGstPreview(li).taxable, 0);

  const handleSubmit = async () => {
    const invalid = lineItems.find(li => !li.product_name || li.rate_rupees <= 0);
    if (invalid) {
      setError("All line items need a product name and rate");
      return;
    }

    setSaving(true);
    setError("");
    setWarnings([]);

    try {
      const body = {
        ...header,
        line_items: lineItems.map(li => ({
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

      const res = await fetch("/api/v1/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || json.details?.join(", ") || "Failed to save");
        return;
      }

      // If invoice file was attached, upload it
      if (invoiceFile && json.data?.entry?.id) {
        const formData = new FormData();
        formData.append("file", invoiceFile);
        await fetch(`/api/v1/entries/${json.data.entry.id}/attachments`, {
          method: "POST",
          body: formData,
        });
      }

      if (json.warnings?.length > 0) {
        setWarnings(json.warnings);
      }

      router.push("/retail/ledger");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="font-mono text-xl tracking-tight">
            {isPurchase ? "🛒" : "💰"} New {header.entry_type.replace("_", " ")}
          </h1>
          <button onClick={() => router.back()} className="text-xs text-gray-500 hover:text-gray-300">← Back</button>
        </header>

        {/* Entry type toggle */}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-900 p-1">
          {["SALE", "PURCHASE", "SALE_RETURN", "PURCHASE_RETURN"].map(t => (
            <button key={t} onClick={() => setHeader(h => ({ ...h, entry_type: t }))}
              className={`rounded-md py-2 text-xs transition-all ${header.entry_type === t ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}>
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Header fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Date</label>
            <input type="date" value={header.entry_date}
              onChange={e => setHeader(h => ({ ...h, entry_date: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase mb-1 block">Payment</label>
            <select value={header.payment_mode}
              onChange={e => setHeader(h => ({ ...h, payment_mode: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>
        </div>

        {/* B2B / B2C toggle + Party fields */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {["B2C", "B2B"].map(ct => (
              <button key={ct} onClick={() => setHeader(h => ({ ...h, customer_type: ct }))}
                className={`flex-1 rounded-lg py-2 text-xs transition-all ${header.customer_type === ct ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {ct}
              </button>
            ))}
          </div>

          {header.customer_type === "B2B" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Party Name</label>
                <input type="text" value={header.party_name}
                  onChange={e => setHeader(h => ({ ...h, party_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Party GSTIN</label>
                <input type="text" value={header.party_gstin}
                  onChange={e => setHeader(h => ({ ...h, party_gstin: e.target.value.toUpperCase() }))}
                  maxLength={15}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase mb-1 block">Invoice #</label>
                <input type="text" value={header.invoice_number}
                  onChange={e => setHeader(h => ({ ...h, invoice_number: e.target.value }))}
                  className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Line Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-400">Line Items</h2>
            <button onClick={addLineItem}
              className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 border border-gray-700">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          {lineItems.map((li, idx) => {
            const gst = calcGstPreview(li);
            const thresholdWarning = li.is_price_sensitive && gst.ratePaise > 100000;
            const nearThreshold = li.is_price_sensitive && gst.ratePaise > 90000 && gst.ratePaise <= 100000;

            return (
              <div key={idx} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 space-y-3">
                {/* Row header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-mono">Item {idx + 1}</span>
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLineItem(idx)} className="text-gray-600 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Product typeahead */}
                <div className="relative">
                  <label className="text-[11px] text-gray-600 uppercase mb-1 block">Product</label>
                  <input type="text" value={li.product_name}
                    onChange={e => {
                      updateLineItem(idx, { product_name: e.target.value });
                      setProductSearch(e.target.value);
                      setShowProducts(idx);
                    }}
                    onBlur={() => setTimeout(() => setShowProducts(null), 200)}
                    placeholder="Start typing product name..."
                    className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
                  {showProducts === idx && products.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 rounded-lg border border-gray-700 bg-gray-950 shadow-xl">
                      {products.map(p => (
                        <button key={p.id} type="button" onMouseDown={() => {
                          updateLineItem(idx, {
                            product_id: p.id,
                            product_name: p.product_name,
                            hsn_code: p.hsn_sac_code,
                            gst_rate: p.default_gst_rate,
                            is_price_sensitive: p.is_price_sensitive,
                            threshold_paise: p.threshold_paise,
                            product_category: p.category,
                          });
                          setShowProducts(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-900 border-b border-gray-800 last:border-0">
                          <span>{p.product_name}</span>
                          <span className="text-gray-600 text-xs ml-2">{p.default_gst_rate}%</span>
                          {p.is_price_sensitive && <span className="text-yellow-500 text-xs ml-1">₹1K threshold</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Qty, Rate, GST% */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase mb-1 block">Qty</label>
                    <input type="number" min={0.001} step="any" value={li.quantity || ""}
                      onChange={e => updateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase mb-1 block">Rate (₹)</label>
                    <input type="number" min={0} step="any" value={li.rate_rupees || ""}
                      onChange={e => updateLineItem(idx, { rate_rupees: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-600 uppercase mb-1 block">GST%</label>
                    <select value={li.gst_rate}
                      onChange={e => updateLineItem(idx, { gst_rate: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none">
                      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                </div>

                {/* GST Preview + Warnings per item */}
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-gray-600">Taxable:</span>
                  <span className="text-gray-400">{fmt(gst.taxable)}</span>
                  <span className="text-gray-600 ml-2">GST:</span>
                  <span className="text-gray-400">{fmt(gst.gst)}</span>
                  <span className="text-gray-600 ml-2">Total:</span>
                  <span className="text-white">{fmt(gst.amountPaise)}</span>
                </div>

                {/* Threshold warnings */}
                {thresholdWarning && (
                  <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 text-xs text-yellow-400">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Rate changed to 12% — item price exceeds ₹1,000
                  </div>
                )}
                {nearThreshold && (
                  <div className="flex items-center gap-2 rounded-md bg-yellow-500/5 border border-yellow-500/10 px-3 py-1.5 text-xs text-yellow-500">
                    Price near ₹1,000 threshold — GST rate changes from 5% to 12%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Invoice attachment */}
        <InvoiceDropzone
          onFileSelected={setInvoiceFile}
          required={isPurchase}
        />

        {/* Grand total preview */}
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2 font-mono text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Total Taxable</span>
            <span>{fmt(totalTaxable)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Total GST</span>
            <span>{fmt(totalGstPaise)}</span>
          </div>
          <div className="flex justify-between text-white font-semibold border-t border-cyan-500/20 pt-2">
            <span>Grand Total</span>
            <span>{fmt(totalPaise)}</span>
          </div>
          {isPurchase && totalGstPaise > 0 && (
            <div className="flex justify-between text-emerald-400 border-t border-emerald-500/20 pt-2">
              <span>Estimated ITC</span>
              <span>{fmt(totalGstPaise)}</span>
            </div>
          )}
        </div>

        {/* Server warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} className="rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-400 flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                {w}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={saving}
          className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : `Save ${header.entry_type.replace("_", " ")}`}
        </button>
      </div>
    </div>
  );
}
