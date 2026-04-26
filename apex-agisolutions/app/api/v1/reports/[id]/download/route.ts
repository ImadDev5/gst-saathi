import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { ITCReportDocument } from "@/lib/reports/pdf-generator";
import { generateITCExcel } from "@/lib/reports/excel-generator";
import React from "react";

export const maxDuration = 60;

/**
 * GET /api/v1/reports/[id]/download?format=pdf|excel
 * Generates and returns the binary report file
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: session } = await supabaseServer
      .from("trial_sessions")
      .select("id, expires_at")
      .eq("token", token)
      .eq("status", "ACTIVE")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Fetch report
    const { data: report } = await supabaseServer
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("trial_id", session.id)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch transactions for the report
    const { data: transactions } = await supabaseServer
      .from("transactions")
      .select("*")
      .eq("trial_id", session.id)
      .order("transaction_date", { ascending: false });

    const txns = transactions || [];
    const summary = report.summary_json;

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "pdf";

    if (format === "excel") {
      // Generate Excel
      const buffer = await generateITCExcel(summary, txns);

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="GSTSaathi_ITC_Report_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    }

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      React.createElement(ITCReportDocument, {
        summary,
        transactions: txns,
        sessionInfo: { expiresAt: session.expires_at },
      })
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="GSTSaathi_ITC_Report_${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Report download error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
