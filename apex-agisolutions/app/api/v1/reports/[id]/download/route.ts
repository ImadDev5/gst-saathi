import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { renderToBuffer } from "@react-pdf/renderer";
import { ITCReportDocument } from "@/lib/reports/pdf-generator";
import { generateITCExcel } from "@/lib/reports/excel-generator";
import React from "react";
import { verifyUserSession, authErrorResponse } from "@/lib/auth";

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
    const auth = await verifyUserSession(req);
    if (!auth.authenticated) {
      return authErrorResponse(auth);
    }

    // Fetch report
    const { data: report } = await supabaseServer
      .from("reports")
      .select("*")
      .eq("id", id)
      .eq("trial_id", auth.trialId)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Fetch transactions for the report
    const { data: transactions } = await supabaseServer
      .from("transactions")
      .select("*")
      .eq("trial_id", auth.trialId)
      .order("transaction_date", { ascending: false });

    const txns = transactions || [];
    const summary = report.summary_json;

    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "pdf";

    if (format === "excel") {
      // Generate Excel
      const buffer = await generateITCExcel(summary, txns);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="GSTSaathi_ITC_Report_${new Date().toISOString().split("T")[0]}.xlsx"`,
        },
      });
    }

    // Generate PDF
    const pdfElement = React.createElement(ITCReportDocument as any, {
      summary,
      transactions: txns,
      sessionInfo: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
    } as any);
    const pdfBuffer = await renderToBuffer(pdfElement as any);

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
