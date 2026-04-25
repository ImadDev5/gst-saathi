/**
 * GSTR-1 and GSTR-3B Mapper
 * Computes official GSTR format from retail_entries
 */

interface RetailEntry {
  entry_type: string;
  customer_type: string;
  party_gstin: string | null;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_paise: number;
  gst_rate: number;
  hsn_code: string | null;
  product_name: string;
  quantity: number;
  unit: string;
}

/**
 * GSTR-1 Mapper — Outward supplies
 */
export function mapGSTR1(entries: RetailEntry[]) {
  const sales = entries.filter(e => e.entry_type === "SALE");

  // B2B: Sales to registered persons (with GSTIN)
  const b2bSupplies = sales
    .filter(e => e.customer_type === "B2B" && e.party_gstin)
    .map(e => ({
      partyGstin: e.party_gstin,
      taxablePaise: e.taxable_paise,
      cgstPaise: e.cgst_paise,
      sgstPaise: e.sgst_paise,
      igstPaise: e.igst_paise,
      gstRate: e.gst_rate,
    }));

  // B2C: Consolidated by rate slab
  const b2cByRate: Record<number, { taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number }> = {};
  sales
    .filter(e => e.customer_type === "B2C")
    .forEach(e => {
      if (!b2cByRate[e.gst_rate]) {
        b2cByRate[e.gst_rate] = { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
      }
      b2cByRate[e.gst_rate].taxablePaise += e.taxable_paise;
      b2cByRate[e.gst_rate].cgstPaise += e.cgst_paise;
      b2cByRate[e.gst_rate].sgstPaise += e.sgst_paise;
      b2cByRate[e.gst_rate].igstPaise += e.igst_paise;
    });

  // HSN summary
  const hsnMap: Record<string, { description: string; quantity: number; unit: string; taxablePaise: number; gstRate: number; totalTaxPaise: number }> = {};
  sales.forEach(e => {
    const key = e.hsn_code || "NONE";
    if (!hsnMap[key]) {
      hsnMap[key] = { description: e.product_name, quantity: 0, unit: e.unit, taxablePaise: 0, gstRate: e.gst_rate, totalTaxPaise: 0 };
    }
    hsnMap[key].quantity += e.quantity;
    hsnMap[key].taxablePaise += e.taxable_paise;
    hsnMap[key].totalTaxPaise += (e.cgst_paise + e.sgst_paise + e.igst_paise);
  });

  return {
    b2bSupplies,
    b2cConsolidated: Object.entries(b2cByRate).map(([rate, vals]) => ({
      gstRate: Number(rate),
      ...vals,
    })),
    hsnSummary: Object.entries(hsnMap).map(([code, vals]) => ({
      hsnCode: code,
      ...vals,
    })),
  };
}

/**
 * GSTR-3B Mapper — Monthly summary return
 * Returns all sections needed for GSTR-3B filing
 */
export function mapGSTR3B(entries: RetailEntry[]) {
  const sales = entries.filter(e => e.entry_type === "SALE" || e.entry_type === "SALE_RETURN");
  const purchases = entries.filter(e => e.entry_type === "PURCHASE" || e.entry_type === "PURCHASE_RETURN");

  // Section 3.1(a) — Outward taxable supplies (other than zero rated, nil rated, exempted)
  const outwardTaxable = {
    taxablePaise: 0, igstPaise: 0, cgstPaise: 0, sgstPaise: 0,
  };

  sales.forEach(e => {
    const multiplier = e.entry_type === "SALE_RETURN" ? -1 : 1;
    outwardTaxable.taxablePaise += e.taxable_paise * multiplier;
    outwardTaxable.igstPaise += e.igst_paise * multiplier;
    outwardTaxable.cgstPaise += e.cgst_paise * multiplier;
    outwardTaxable.sgstPaise += e.sgst_paise * multiplier;
  });

  // Section 3.1(c) — Zero rated + nil rated + exempted
  const nilRated = {
    taxablePaise: 0, igstPaise: 0, cgstPaise: 0, sgstPaise: 0,
  };

  sales.filter(e => e.gst_rate === 0).forEach(e => {
    nilRated.taxablePaise += e.taxable_paise;
  });

  // Section 4(A)(5) — All other ITC
  const itcAvailed = {
    igstPaise: 0, cgstPaise: 0, sgstPaise: 0,
  };

  purchases.filter(e => e.entry_type === "PURCHASE").forEach(e => {
    itcAvailed.igstPaise += e.igst_paise;
    itcAvailed.cgstPaise += e.cgst_paise;
    itcAvailed.sgstPaise += e.sgst_paise;
  });

  // Section 4(B)(2) — ITC reversed (purchase returns)
  const itcReversed = {
    igstPaise: 0, cgstPaise: 0, sgstPaise: 0,
  };

  purchases.filter(e => e.entry_type === "PURCHASE_RETURN").forEach(e => {
    itcReversed.igstPaise += e.igst_paise;
    itcReversed.cgstPaise += e.cgst_paise;
    itcReversed.sgstPaise += e.sgst_paise;
  });

  // Section 6.1 — Net tax payable
  const netIgst = outwardTaxable.igstPaise - (itcAvailed.igstPaise - itcReversed.igstPaise);
  const netCgst = outwardTaxable.cgstPaise - (itcAvailed.cgstPaise - itcReversed.cgstPaise);
  const netSgst = outwardTaxable.sgstPaise - (itcAvailed.sgstPaise - itcReversed.sgstPaise);

  return {
    "3_1_a": { label: "Outward taxable supplies", ...outwardTaxable },
    "3_1_c": { label: "Nil rated / Exempted supplies", ...nilRated },
    "4_A_5": { label: "All other ITC", ...itcAvailed },
    "4_B_2": { label: "ITC reversed", ...itcReversed },
    "6_1": {
      label: "Net tax payable",
      igstPaise: Math.max(0, netIgst),
      cgstPaise: Math.max(0, netCgst),
      sgstPaise: Math.max(0, netSgst),
      totalPayablePaise: Math.max(0, netIgst) + Math.max(0, netCgst) + Math.max(0, netSgst),
    },
  };
}
