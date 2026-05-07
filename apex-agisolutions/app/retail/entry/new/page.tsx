"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import InvoiceDropzone from "@/components/InvoiceDropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GST_RATES = [0, 5, 12, 18, 28];

interface LineItemForm {
  product_id: string;
  product_name: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  rate_rupees: number;
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

  useEffect(() => {
    const idx = showProducts;
    if (idx !== null && productSearch.length >= 2) {
      fetch(`/api/v1/products?q=${encodeURIComponent(productSearch)}&limit=5`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setProducts(json.data); });
    } else {
      setProducts([]);
    }
  }, [productSearch, showProducts]);

  const updateLineItem = useCallback((idx: number, updates: Partial<LineItemForm>) => {
    setLineItems((prev) => prev.map((li, i) => (i === idx ? { ...li, ...updates } : li)));
  }, []);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { product_id: "", product_name: "", hsn_code: "", quantity: 1, unit: "pcs", rate_rupees: 0, gst_rate: 18, is_price_sensitive: false, threshold_paise: 100000, product_category: null },
    ]);
  };

  const removeLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const calcGstPreview = (li: LineItemForm) => {
    const ratePaise = Math.round(li.rate_rupees * 100);
    const amountPaise = Math.round(li.quantity * ratePaise);
    const taxable = Math.round(amountPaise * 100 / (100 + li.gst_rate));
    const gst = amountPaise - taxable;
    return { ratePaise, amountPaise, taxable, gst };
  };

  const totalPaise = lineItems.reduce((s, li) => s + calcGstPreview(li).amountPaise, 0);
  const totalGstPaise = lineItems.reduce((s, li) => s + calcGstPreview(li).gst, 0);
  const totalTaxable = lineItems.reduce((s, li) => s + calcGstPreview(li).taxable, 0);

  const handleSubmit = async () => {
    const invalid = lineItems.find((li) => !li.product_name || li.rate_rupees <= 0);
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
        line_items: lineItems.map((li) => ({
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
    <div className="p-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            New {header.entry_type.replace("_", " ")}
          </h1>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            &larr; Back
          </Button>
        </div>

        <Tabs
          value={header.entry_type}
          onValueChange={(v: string) => setHeader((h) => ({ ...h, entry_type: v }))}
          className="mt-4"
        >
          <TabsList className="grid grid-cols-4 w-full bg-slate-100">
            {(["SALE", "PURCHASE", "SALE_RETURN", "PURCHASE_RETURN"] as const).map((t) => {
              const labels: Record<string, string> = {
                SALE: "Sale",
                PURCHASE: "Purchase",
                SALE_RETURN: "Sale Return",
                PURCHASE_RETURN: "Purchase Return",
              };
              return (
                <TabsTrigger key={t} value={t} className="text-xs">
                  {labels[t]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-slate-500">Date</Label>
            <Input
              type="date"
              value={header.entry_date}
              onChange={(e) => setHeader((h) => ({ ...h, entry_date: e.target.value }))}
              className="bg-white border-slate-200 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-500">Payment</Label>
            <Select value={header.payment_mode} onValueChange={(v) => { if (v) setHeader((h) => ({ ...h, payment_mode: v })); }}>
              <SelectTrigger className="bg-white border-slate-200 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Label className="text-xs font-medium text-slate-500">Customer type</Label>
          <Tabs value={header.customer_type} onValueChange={(v: string) => setHeader((h) => ({ ...h, customer_type: v }))}>
            <TabsList className="grid grid-cols-2 w-56 bg-slate-100">
              <TabsTrigger value="B2C" className="text-xs">Regular customer</TabsTrigger>
              <TabsTrigger value="B2B" className="text-xs">Registered business</TabsTrigger>
            </TabsList>
          </Tabs>

          <AnimatePresence>
            {header.customer_type === "B2B" && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-medium text-slate-500">Party Name</Label>
                  <Input
                    type="text"
                    value={header.party_name}
                    onChange={(e) => setHeader((h) => ({ ...h, party_name: e.target.value }))}
                    className="bg-white border-slate-200 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500">Party GST number</Label>
                  <Input
                    type="text"
                    value={header.party_gstin}
                    onChange={(e) => setHeader((h) => ({ ...h, party_gstin: e.target.value.toUpperCase() }))}
                    maxLength={15}
                    className="bg-white border-slate-200 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-500">Invoice #</Label>
                  <Input
                    type="text"
                    value={header.invoice_number}
                    onChange={(e) => setHeader((h) => ({ ...h, invoice_number: e.target.value }))}
                    className="bg-white border-slate-200 mt-1"
                  />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900">Items</h2>
            <Button variant="outline" size="sm" onClick={addLineItem} className="text-xs border-slate-200">
              <Plus className="w-3 h-3 mr-1" /> Add Item
            </Button>
          </div>

          {lineItems.map((li, idx) => {
            const gst = calcGstPreview(li);
            const thresholdWarning = li.is_price_sensitive && gst.ratePaise > 100000;
            const nearThreshold = li.is_price_sensitive && gst.ratePaise > 90000 && gst.ratePaise <= 100000;

            return (
              <Card key={idx} className="border-slate-200 bg-slate-50/50 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono tabular-nums">Item {idx + 1}</span>
                    {lineItems.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLineItem(idx)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <Label className="text-xs font-medium text-slate-500">Product</Label>
                    <Input
                      type="text"
                      value={li.product_name}
                      onChange={(e) => {
                        updateLineItem(idx, { product_name: e.target.value });
                        setProductSearch(e.target.value);
                        setShowProducts(idx);
                      }}
                      onBlur={() => setTimeout(() => setShowProducts(null), 200)}
                      placeholder="Start typing product name..."
                      className="bg-white border-slate-200 mt-1"
                    />
                    {showProducts === idx && products.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 rounded-lg border border-slate-200 bg-white shadow-lg">
                        {products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => {
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
                            className="w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          >
                            <span>{p.product_name}</span>
                            <span className="text-slate-400 text-xs ml-2">{p.default_gst_rate}%</span>
                            {p.is_price_sensitive && <span className="text-slate-500 text-xs ml-1">₹1K threshold</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-500">Qty</Label>
                      <Input
                        type="number"
                        min={0.001}
                        step="any"
                        value={li.quantity || ""}
                        onChange={(e) => updateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                        className="bg-white border-slate-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500">Rate (₹)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={li.rate_rupees || ""}
                        onChange={(e) => updateLineItem(idx, { rate_rupees: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="bg-white border-slate-200 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-500">GST%</Label>
                      <Select value={String(li.gst_rate)} onValueChange={(v) => { if (v) updateLineItem(idx, { gst_rate: Number(v) }); }}>
                        <SelectTrigger className="bg-white border-slate-200 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GST_RATES.map((r) => (
                            <SelectItem key={r} value={String(r)}>{r}%</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 tabular-nums">
                    <span>Before tax: <span className="text-slate-900">{fmt(gst.taxable)}</span></span>
                    <span>Tax: <span className="text-slate-900">{fmt(gst.gst)}</span></span>
                    <span>Total: <span className="text-slate-900 font-medium">{fmt(gst.amountPaise)}</span></span>
                  </div>

                  {thresholdWarning && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="w-3 h-3" />
                      <AlertDescription className="text-xs">
                        Rate changed to 12% — item price exceeds ₹1,000
                      </AlertDescription>
                    </Alert>
                  )}
                  {nearThreshold && (
                    <Alert className="py-2 border-amber-200 bg-amber-50">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-700">
                        Price near ₹1,000 threshold — GST rate changes from 5% to 12%
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6">
          <InvoiceDropzone onFileSelected={setInvoiceFile} required={isPurchase} />
        </div>

        <Card className="mt-6 border-slate-200 bg-slate-50 shadow-sm">
          <CardContent className="p-4 space-y-2 font-mono text-sm tabular-nums">
            <div className="flex justify-between text-slate-500">
              <span>Sale value (before tax)</span>
              <span>{fmt(totalTaxable)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax</span>
              <span>{fmt(totalGstPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-semibold border-t border-slate-200 pt-2">
              <span>Grand Total</span>
              <span>{fmt(totalPaise)}</span>
            </div>
            {isPurchase && totalGstPaise > 0 && (
              <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-2">
                <span>Tax you can claim back</span>
                <span>{fmt(totalGstPaise)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {warnings.length > 0 && (
          <div className="space-y-1 mt-4">
            {warnings.map((w, i) => (
              <Alert key={i} className="border-amber-200 bg-amber-50">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">{w}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="w-3 h-3" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-6 w-full bg-slate-900 text-white hover:bg-slate-800 h-11"
        >
          {saving ? "Saving..." : `Save ${(() => {
            const labels: Record<string, string> = {
              SALE: "Sale",
              PURCHASE: "Purchase",
              SALE_RETURN: "Sale Return",
              PURCHASE_RETURN: "Purchase Return",
            };
            return labels[header.entry_type] || header.entry_type;
          })()}`}
        </Button>
      </div>
    </div>
  );
}