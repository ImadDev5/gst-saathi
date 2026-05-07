import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Styles
const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a" },
  header: { marginBottom: 20, borderBottom: "2px solid #0891b2", paddingBottom: 12 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#0891b2" },
  subtitle: { fontSize: 11, color: "#666", marginTop: 4 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 8, color: "#1a1a1a", borderBottom: "1px solid #e5e7eb", paddingBottom: 4 },
  row: { flexDirection: "row", borderBottom: "1px solid #f3f4f6", paddingVertical: 4 },
  headerRow: { flexDirection: "row", borderBottom: "2px solid #d1d5db", paddingBottom: 4, marginBottom: 2 },
  cellLabel: { width: "50%", color: "#6b7280", fontSize: 9 },
  cellValue: { width: "25%", textAlign: "right", fontFamily: "Helvetica-Bold" },
  cellStatus: { width: "25%", textAlign: "center", fontSize: 8 },
  metricCard: { backgroundColor: "#f9fafb", padding: 10, borderRadius: 4, width: "30%", marginRight: 8 },
  metricLabel: { fontSize: 8, color: "#6b7280", textTransform: "uppercase" as const },
  metricValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  green: { color: "#10b981" },
  red: { color: "#ef4444" },
  amber: { color: "#f59e0b" },
  footer: { position: "absolute" as const, bottom: 20, left: 40, right: 40, fontSize: 7, color: "#9ca3af", flexDirection: "row", justifyContent: "space-between" },
  watermark: { fontSize: 7, color: "#d1d5db", textAlign: "center" as const, marginTop: 30 },
  tableHeader: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280", textTransform: "uppercase" as const },
  col1: { width: "35%" },
  col2: { width: "20%" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "center" },
});

function fmt(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

interface Transaction {
  description: string;
  mapped_vendor_name: string | null;
  amount: number;
  gst_amount: number;
  itc_status: string;
  block_reason: string | null;
  transaction_date: string;
}

interface ReportData {
  generatedAt: string;
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

interface Props {
  summary: ReportData;
  transactions: Transaction[];
  sessionInfo?: { expiresAt?: string };
}

export function ITCReportDocument({ summary, transactions, sessionInfo }: Props) {
  const eligiblePct = summary.totalGstPaise > 0
    ? Math.round((summary.eligible.totalPaise / summary.totalGstPaise) * 100)
    : 0;

  return (
    <Document>
      {/* Page 1: Summary */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>TaxApex ITC Analysis Report</Text>
          <Text style={s.subtitle}>
            Generated: {new Date(summary.generatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
            {sessionInfo?.expiresAt ? ` • Trial expires: ${new Date(sessionInfo.expiresAt).toLocaleDateString("en-IN")}` : ""}
          </Text>
        </View>

        {/* Section 1: Key Metrics */}
        <Text style={s.sectionTitle}>1. Executive Summary</Text>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Eligible ITC</Text>
            <Text style={[s.metricValue, s.green]}>{fmt(summary.eligible.totalPaise)}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Blocked Credit</Text>
            <Text style={[s.metricValue, s.red]}>{fmt(summary.blocked.totalPaise)}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>RCM Payable</Text>
            <Text style={[s.metricValue, s.amber]}>{fmt(summary.rcm.totalPaise)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", marginBottom: 16 }}>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Total Transactions</Text>
            <Text style={s.metricValue}>{summary.totalTransactions}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>Total Amount</Text>
            <Text style={s.metricValue}>{fmt(summary.totalAmountPaise)}</Text>
          </View>
          <View style={s.metricCard}>
            <Text style={s.metricLabel}>ITC Recovery Rate</Text>
            <Text style={[s.metricValue, eligiblePct > 50 ? s.green : s.red]}>{eligiblePct}%</Text>
          </View>
        </View>

        {/* Section 2: Status Breakdown */}
        <Text style={s.sectionTitle}>2. Classification Breakdown</Text>
        {[
          { label: "Eligible (claimable)", data: summary.eligible, color: s.green },
          { label: "Blocked (Section 17(5))", data: summary.blocked, color: s.red },
          { label: "RCM (reverse charge)", data: summary.rcm, color: s.amber },
          { label: "Unknown / Needs Review", data: summary.unknown, color: {} },
        ].map((row, i) => (
          <View key={i} style={s.row}>
            <Text style={[s.cellLabel, { width: "40%" }]}>{row.label}</Text>
            <Text style={[s.cellValue, row.color, { width: "20%" }]}>{fmt(row.data.totalPaise)}</Text>
            <Text style={[s.cellStatus, { width: "20%" }]}>{row.data.count} txns</Text>
            <Text style={[s.cellStatus, { width: "20%" }]}>
              {summary.totalGstPaise > 0 ? Math.round((row.data.totalPaise / summary.totalGstPaise) * 100) : 0}%
            </Text>
          </View>
        ))}

        {/* Section 3: Blocked Categories */}
        {summary.blockedCategories.length > 0 && (
          <>
            <Text style={s.sectionTitle}>3. Blocked Credit Categories</Text>
            {summary.blockedCategories.map((cat, i) => (
              <View key={i} style={s.row}>
                <Text style={[s.cellLabel, { width: "50%" }]}>{cat.reason}</Text>
                <Text style={[s.cellValue, s.red, { width: "25%" }]}>{fmt(cat.amount)}</Text>
                <Text style={[s.cellStatus, { width: "25%" }]}>{cat.count} txns</Text>
              </View>
            ))}
          </>
        )}

        {/* Section 4: Top Vendors */}
        {summary.topVendors.length > 0 && (
          <>
            <Text style={s.sectionTitle}>4. Top Vendors by Amount</Text>
            {summary.topVendors.slice(0, 8).map((v, i) => (
              <View key={i} style={s.row}>
                <Text style={[s.cellLabel, { width: "50%" }]}>{i + 1}. {v.name}</Text>
                <Text style={[s.cellValue, { width: "25%" }]}>{fmt(v.amount)}</Text>
                <Text style={[s.cellStatus, { width: "25%" }]}>{v.status}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={s.watermark}>This report is auto-generated by TaxApex. Consult your CA before filing.</Text>
        <View style={s.footer}>
          <Text>TaxApex • taxapex.com</Text>
          <Text>Page 1</Text>
        </View>
      </Page>

      {/* Page 2: Transaction Details */}
      <Page size="A4" style={s.page}>
        <Text style={s.sectionTitle}>5. Transaction Details</Text>
        <View style={s.headerRow}>
          <Text style={[s.tableHeader, s.col1]}>Narration</Text>
          <Text style={[s.tableHeader, s.col2]}>Vendor</Text>
          <Text style={[s.tableHeader, s.col3]}>Amount</Text>
          <Text style={[s.tableHeader, s.col4]}>GST</Text>
          <Text style={[s.tableHeader, s.col5]}>Status</Text>
        </View>
        {transactions.slice(0, 40).map((t, i) => (
          <View key={i} style={s.row}>
            <Text style={[s.col1, { fontSize: 8 }]}>{t.description.substring(0, 40)}</Text>
            <Text style={[s.col2, { fontSize: 8 }]}>{t.mapped_vendor_name || "—"}</Text>
            <Text style={[s.col3, { fontSize: 8 }]}>{fmt(t.amount)}</Text>
            <Text style={[s.col4, { fontSize: 8 }]}>{fmt(t.gst_amount)}</Text>
            <Text style={[s.col5, { fontSize: 7, color: t.itc_status === "ELIGIBLE" ? "#10b981" : t.itc_status === "BLOCKED" ? "#ef4444" : "#6b7280" }]}>
              {t.itc_status}
            </Text>
          </View>
        ))}
        {transactions.length > 40 && (
          <Text style={{ fontSize: 8, color: "#9ca3af", marginTop: 8 }}>
            + {transactions.length - 40} more transactions (see Excel export for full list)
          </Text>
        )}

        {/* Section 6: CA Recommendations */}
        <Text style={s.sectionTitle}>6. Recommendations for CA</Text>
        <View style={{ backgroundColor: "#fef3c7", padding: 10, borderRadius: 4 }}>
          {summary.blocked.count > 0 && (
            <Text style={{ fontSize: 9, marginBottom: 4 }}>
              • {summary.blocked.count} blocked credits totaling {fmt(summary.blocked.totalPaise)} — do NOT claim in GSTR-3B
            </Text>
          )}
          {summary.rcm.count > 0 && (
            <Text style={{ fontSize: 9, marginBottom: 4 }}>
              • {summary.rcm.count} RCM transactions totaling {fmt(summary.rcm.totalPaise)} — pay via RCM challan, claim ITC same month
            </Text>
          )}
          {summary.unknown.count > 0 && (
            <Text style={{ fontSize: 9, marginBottom: 4 }}>
              • {summary.unknown.count} unclassified transactions — manual review recommended
            </Text>
          )}
          <Text style={{ fontSize: 9 }}>
            • Net claimable ITC: {fmt(summary.eligible.totalPaise)} — verify against GSTR-2B before filing
          </Text>
        </View>

        <Text style={s.watermark}>This report is auto-generated by TaxApex. Consult your CA before filing.</Text>
        <View style={s.footer}>
          <Text>TaxApex • taxapex.com</Text>
          <Text>Page 2</Text>
        </View>
      </Page>
    </Document>
  );
}
