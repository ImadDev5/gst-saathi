import ExcelJS from "exceljs";

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  gst_amount: number;
  itc_status: string;
  mapped_vendor_name: string | null;
  block_reason: string | null;
}

interface ReportSummary {
  totalTransactions: number;
  eligible: { count: number; totalPaise: number };
  blocked: { count: number; totalPaise: number };
  rcm: { count: number; totalPaise: number };
  unknown: { count: number; totalPaise: number };
  totalGstPaise: number;
  totalAmountPaise: number;
  topVendors: { name: string; amount: number; status: string }[];
  blockedCategories: { reason: string; count: number; amount: number }[];
}

function toRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/**
 * Generate a multi-sheet Excel workbook for ITC analysis
 */
export async function generateITCExcel(
  summary: ReportSummary,
  transactions: Transaction[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "TaxApex";
  wb.created = new Date();

  // ==================== Sheet 1: Summary ====================
  const summarySheet = wb.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF0891B2" } },
  });

  // Title
  summarySheet.mergeCells("A1:E1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "TaxApex — ITC Analysis Report";
  titleCell.font = { size: 16, bold: true, color: { argb: "FF0891B2" } };
  titleCell.alignment = { horizontal: "left" };

  summarySheet.mergeCells("A2:E2");
  summarySheet.getCell("A2").value = `Generated: ${new Date().toLocaleDateString("en-IN")}`;
  summarySheet.getCell("A2").font = { size: 10, color: { argb: "FF6B7280" } };

  // Metrics
  const metricsStart = 4;
  const metrics = [
    ["Metric", "Amount (₹)", "Count", "% of Total"],
    ["Eligible ITC", toRupees(summary.eligible.totalPaise), summary.eligible.count, summary.totalGstPaise > 0 ? `${Math.round((summary.eligible.totalPaise / summary.totalGstPaise) * 100)}%` : "0%"],
    ["Blocked Credit", toRupees(summary.blocked.totalPaise), summary.blocked.count, summary.totalGstPaise > 0 ? `${Math.round((summary.blocked.totalPaise / summary.totalGstPaise) * 100)}%` : "0%"],
    ["RCM Payable", toRupees(summary.rcm.totalPaise), summary.rcm.count, summary.totalGstPaise > 0 ? `${Math.round((summary.rcm.totalPaise / summary.totalGstPaise) * 100)}%` : "0%"],
    ["Unknown / Review", toRupees(summary.unknown.totalPaise), summary.unknown.count, summary.totalGstPaise > 0 ? `${Math.round((summary.unknown.totalPaise / summary.totalGstPaise) * 100)}%` : "0%"],
    [],
    ["Total Transactions", "", summary.totalTransactions, ""],
    ["Total Amount", toRupees(summary.totalAmountPaise), "", ""],
    ["Total GST Component", toRupees(summary.totalGstPaise), "", ""],
  ];

  metrics.forEach((row, i) => {
    const excelRow = summarySheet.getRow(metricsStart + i);
    if (Array.isArray(row)) {
      row.forEach((val, j) => {
        excelRow.getCell(j + 1).value = val as string | number;
      });
    }

    // Style header row
    if (i === 0) {
      excelRow.eachCell(cell => {
        cell.font = { bold: true, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
        cell.border = { bottom: { style: "medium", color: { argb: "FFD1D5DB" } } };
      });
    }

    // Color-code status rows
    if (i === 1) excelRow.getCell(2).font = { color: { argb: "FF10B981" }, bold: true };
    if (i === 2) excelRow.getCell(2).font = { color: { argb: "FFEF4444" }, bold: true };
    if (i === 3) excelRow.getCell(2).font = { color: { argb: "FFF59E0B" }, bold: true };
  });

  summarySheet.columns = [
    { width: 22 }, { width: 18 }, { width: 12 }, { width: 14 },
  ];

  // ==================== Sheet 2: Transactions ====================
  const txnSheet = wb.addWorksheet("Transactions", {
    properties: { tabColor: { argb: "FF10B981" } },
  });

  txnSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Narration", key: "narration", width: 40 },
    { header: "Vendor", key: "vendor", width: 22 },
    { header: "Amount (₹)", key: "amount", width: 15 },
    { header: "GST (₹)", key: "gst", width: 12 },
    { header: "ITC Status", key: "status", width: 14 },
    { header: "Block Reason", key: "reason", width: 30 },
  ];

  // Style header
  txnSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
    cell.alignment = { horizontal: "center" };
  });

  // Add data rows
  const statusColors: Record<string, string> = {
    ELIGIBLE: "FF10B981",
    BLOCKED: "FFEF4444",
    RCM: "FFF59E0B",
    UNKNOWN: "FF6B7280",
    CONDITIONAL: "FFF97316",
    AT_RISK: "FFEAB308",
  };

  transactions.forEach(t => {
    const row = txnSheet.addRow({
      date: new Date(t.transaction_date).toLocaleDateString("en-IN"),
      narration: t.description,
      vendor: t.mapped_vendor_name || "—",
      amount: toRupees(t.amount),
      gst: toRupees(t.gst_amount),
      status: t.itc_status,
      reason: t.block_reason || "",
    });

    // Color-code status cell
    const statusCell = row.getCell(6);
    const color = statusColors[t.itc_status] || statusColors.UNKNOWN;
    statusCell.font = { color: { argb: color }, bold: true };
  });

  // Auto-filter
  txnSheet.autoFilter = { from: "A1", to: "G1" };

  // ==================== Sheet 3: Blocked Analysis ====================
  if (summary.blockedCategories.length > 0) {
    const blockedSheet = wb.addWorksheet("Blocked Credits", {
      properties: { tabColor: { argb: "FFEF4444" } },
    });

    blockedSheet.columns = [
      { header: "Block Reason (Section 17(5))", key: "reason", width: 45 },
      { header: "Count", key: "count", width: 10 },
      { header: "Amount (₹)", key: "amount", width: 18 },
    ];

    blockedSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEF4444" } };
    });

    summary.blockedCategories.forEach(cat => {
      blockedSheet.addRow({
        reason: cat.reason,
        count: cat.count,
        amount: toRupees(cat.amount),
      });
    });
  }

  // ==================== Sheet 4: Top Vendors ====================
  if (summary.topVendors.length > 0) {
    const vendorSheet = wb.addWorksheet("Top Vendors", {
      properties: { tabColor: { argb: "FF8B5CF6" } },
    });

    vendorSheet.columns = [
      { header: "#", key: "rank", width: 6 },
      { header: "Vendor", key: "name", width: 30 },
      { header: "Amount (₹)", key: "amount", width: 18 },
      { header: "ITC Status", key: "status", width: 14 },
    ];

    vendorSheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF8B5CF6" } };
    });

    summary.topVendors.forEach((v, i) => {
      vendorSheet.addRow({
        rank: i + 1,
        name: v.name,
        amount: toRupees(v.amount),
        status: v.status,
      });
    });
  }

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
