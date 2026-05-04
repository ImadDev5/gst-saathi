/**
 * GSTR-1 and GSTR-3B Mapper
 * Computes official GSTR format from entries + nested entry_line_items
 */

interface LineItem {
  product_name: string;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_gst_paise: number;
  total_paise: number;
  gst_rate: number;
  itc_status: string;
  itc_amount_paise: number;
  block_reason: string | null;
}

interface Entry {
  id: string;
  entry_type: string;
  entry_date: string;
  customer_type: string;
  party_gstin: string | null;
  party_name: string | null;
  entry_line_items: LineItem[];
}

/**
 * GSTR-1 Mapper — Outward supplies
 */
export function mapGSTR1(entries: Entry[]) {
  const sales = entries.filter(e => e.entry_type === "SALE" || e.entry_type === "SALE_RETURN");

  // B2B: Sales to registered persons (with GSTIN)
  interface B2BSupply {
    partyGstin: string | null;
    taxablePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    gstRate: number;
  }
  const b2bSupplies: B2BSupply[] = [];
  sales
    .filter(e => e.customer_type === "B2B" && e.party_gstin)
    .forEach(e => {
      const multiplier = e.entry_type === "SALE_RETURN" ? -1 : 1;
      (e.entry_line_items || []).forEach(li => {
        b2bSupplies.push({
          partyGstin: e.party_gstin,
          taxablePaise: li.taxable_paise * multiplier,
          cgstPaise: li.cgst_paise * multiplier,
          sgstPaise: li.sgst_paise * multiplier,
          igstPaise: li.igst_paise * multiplier,
          gstRate: li.gst_rate,
        });
      });
    });

  // B2C: Consolidated by rate slab
  const b2cByRate: Record<number, { taxablePaise: number; cgstPaise: number; sgstPaise: number; igstPaise: number }> = {};
  sales
    .filter(e => e.customer_type === "B2C")
    .forEach(e => {
      const multiplier = e.entry_type === "SALE_RETURN" ? -1 : 1;
      (e.entry_line_items || []).forEach(li => {
        if (!b2cByRate[li.gst_rate]) {
          b2cByRate[li.gst_rate] = { taxablePaise: 0, cgstPaise: 0, sgstPaise: 0, igstPaise: 0 };
        }
        b2cByRate[li.gst_rate].taxablePaise += li.taxable_paise * multiplier;
        b2cByRate[li.gst_rate].cgstPaise += li.cgst_paise * multiplier;
        b2cByRate[li.gst_rate].sgstPaise += li.sgst_paise * multiplier;
        b2cByRate[li.gst_rate].igstPaise += li.igst_paise * multiplier;
      });
    });

  // HSN summary
  const hsnMap: Record<string, { description: string; quantity: number; unit: string; taxablePaise: number; gstRate: number; totalTaxPaise: number }> = {};
  sales.forEach(e => {
    (e.entry_line_items || []).forEach(li => {
      const key = li.hsn_code || "NONE";
      if (!hsnMap[key]) {
        hsnMap[key] = { description: li.product_name, quantity: 0, unit: li.unit, taxablePaise: 0, gstRate: li.gst_rate, totalTaxPaise: 0 };
      }
      hsnMap[key].quantity += li.quantity;
      hsnMap[key].taxablePaise += li.taxable_paise;
      hsnMap[key].totalTaxPaise += li.total_gst_paise;
    });
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
 */
export function mapGSTR3B(entries: Entry[]) {
  const sales = entries.filter(e => e.entry_type === "SALE" || e.entry_type === "SALE_RETURN");
  const purchases = entries.filter(e => e.entry_type === "PURCHASE" || e.entry_type === "PURCHASE_RETURN");

  // Section 3.1(a) — Outward taxable supplies
  const outwardTaxable = { taxablePaise: 0, igstPaise: 0, cgstPaise: 0, sgstPaise: 0 };
  sales.forEach(e => {
    const m = e.entry_type === "SALE_RETURN" ? -1 : 1;
    (e.entry_line_items || []).forEach(li => {
      outwardTaxable.taxablePaise += li.taxable_paise * m;
      outwardTaxable.igstPaise += li.igst_paise * m;
      outwardTaxable.cgstPaise += li.cgst_paise * m;
      outwardTaxable.sgstPaise += li.sgst_paise * m;
    });
  });

  // Group outward by rate slab for 3.1(a) detail
  const outwardByRate: Record<number, { taxablePaise: number; igstPaise: number; cgstPaise: number; sgstPaise: number }> = {};
  sales.forEach(e => {
    const m = e.entry_type === "SALE_RETURN" ? -1 : 1;
    (e.entry_line_items || []).forEach(li => {
      const r = li.gst_rate;
      if (!outwardByRate[r]) outwardByRate[r] = { taxablePaise: 0, igstPaise: 0, cgstPaise: 0, sgstPaise: 0 };
      outwardByRate[r].taxablePaise += li.taxable_paise * m;
      outwardByRate[r].igstPaise += li.igst_paise * m;
      outwardByRate[r].cgstPaise += li.cgst_paise * m;
      outwardByRate[r].sgstPaise += li.sgst_paise * m;
    });
  });

  // Section 3.1(c) — Nil rated
  const nilRated = { taxablePaise: 0, igstPaise: 0 };
  sales.forEach(e => {
    (e.entry_line_items || []).forEach(li => {
      if (li.gst_rate === 0) nilRated.taxablePaise += li.taxable_paise;
    });
  });

  // Section 4(A)(5) — All other ITC (eligible ITC from purchases)
  const itcAvailed = { igstPaise: 0, cgstPaise: 0, sgstPaise: 0 };
  const itcBlocked = { totalPaise: 0 };
  purchases.forEach(e => {
    (e.entry_line_items || []).forEach(li => {
      if (li.itc_status === 'ELIGIBLE' || li.itc_status === 'RCM') {
        itcAvailed.igstPaise += li.igst_paise;
        itcAvailed.cgstPaise += li.cgst_paise;
        itcAvailed.sgstPaise += li.sgst_paise;
      } else if (li.itc_status === 'BLOCKED') {
        itcBlocked.totalPaise += li.total_gst_paise;
      }
    });
  });

  // Section 4(B)(2) — ITC reversed (purchase returns)
  const itcReversed = { igstPaise: 0, cgstPaise: 0, sgstPaise: 0 };
  purchases.filter(e => e.entry_type === "PURCHASE_RETURN").forEach(e => {
    (e.entry_line_items || []).forEach(li => {
      itcReversed.igstPaise += li.igst_paise;
      itcReversed.cgstPaise += li.cgst_paise;
      itcReversed.sgstPaise += li.sgst_paise;
    });
  });

  // Section 6.1 — Net tax payable
  const netIgst = outwardTaxable.igstPaise - (itcAvailed.igstPaise - itcReversed.igstPaise);
  const netCgst = outwardTaxable.cgstPaise - (itcAvailed.cgstPaise - itcReversed.cgstPaise);
  const netSgst = outwardTaxable.sgstPaise - (itcAvailed.sgstPaise - itcReversed.sgstPaise);

  return {
    "3_1_a": { label: "Outward taxable supplies (other than nil/exempt)", ...outwardTaxable },
    "3_1_a_by_rate": outwardByRate,
    "3_1_c": { label: "Nil rated / Exempted supplies", ...nilRated },
    "4_A_5": { label: "All other ITC (eligible+available)", ...itcAvailed },
    "4_A_blocked": { label: "ITC blocked (Section 17(5))", ...itcBlocked },
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
