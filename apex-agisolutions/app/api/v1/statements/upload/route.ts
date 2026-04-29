import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { inngest } from "@/inngest/client";
import { runStatementPipeline } from "@/inngest/functions";

async function processUploadedCsvWithAI(args: {
  statementId: string;
  trialId: string;
  filename: string;
  bankName: string;
  fileBuffer: ArrayBuffer;
}) {
  await runStatementPipeline({
    statementId: args.statementId,
    storagePath: "", // Not used when fileBuffer is provided
    trialId: args.trialId,
    filename: args.filename,
    bankName: args.bankName,
    fileBuffer: Buffer.from(args.fileBuffer),
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bankName = formData.get("bankName") as string;
    const trialToken = req.cookies.get("trial_token")?.value || req.cookies.get("user_session")?.value;

    if (!file || !bankName || !trialToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (fileExt !== "csv" && fileExt !== "pdf") {
      return NextResponse.json(
        { error: "Only CSV and PDF files are supported" },
        { status: 400 },
      );
    }

    // Step 1: Validate Session Token (trial_token or user_session)
    let trialId: string;

    // Try trial_sessions first (legacy)
    const { data: trialSession, error: trialError } = await supabaseServer
      .from("trial_sessions")
      .select("id, status")
      .eq("token", trialToken)
      .single();

    if (trialSession && trialSession.status === "ACTIVE") {
      trialId = trialSession.id;
    } else {
      // Try user_sessions (new role-based system)
      const { data: userSession, error: userError } = await supabaseServer
        .from("user_sessions")
        .select("id, trial_session_id, status")
        .eq("token", trialToken)
        .single();

      if (userError || !userSession || userSession.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Invalid or expired session token" },
          { status: 401 },
        );
      }

      trialId = userSession.trial_session_id || userSession.id;
    }

    // Step 2: Upload File to Supabase Storage
    const storagePath = `${trialId}/${crypto.randomUUID()}.${fileExt}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseServer.storage
      .from("statements")
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "text/csv",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 },
      );
    }

    // Step 3: Insert Statement Record (status: PROCESSING)
    const { data: statement, error: dbError } = await supabaseServer
      .from("statements")
      .insert({
        trial_id: trialId,
        filename: file.name,
        bank_name: bankName,
        status: "PROCESSING",
      })
      .select()
      .single();

    if (dbError || !statement) {
      console.error("DB Error:", dbError);
      return NextResponse.json(
        { error: "Failed to track statement in Database" },
        { status: 500 },
      );
    }

    const statementId = statement.id;

    // Step 4: Dispatch processing
    // CSV: run full pipeline (parse + vendor-match + AI classify) synchronously
    // with direct buffer access to save time. This fits within Vercel Hobby's
    // 10s limit when batch size is large enough (e.g. 100-200).
    // PDF: route through Inngest for heavier processing.
    if (fileExt === "csv") {
      try {
        await processUploadedCsvWithAI({
          statementId,
          trialId,
          filename: file.name,
          bankName,
          fileBuffer,
        });
      } catch (processingError) {
        const message =
          processingError instanceof Error
            ? processingError.message
            : "Statement processing failed";

        console.error("CSV processing error:", processingError);

        await supabaseServer
          .from("statements")
          .update({
            status: "FAILED",
            error_message: message,
          })
          .eq("id", statementId);

        return NextResponse.json(
          { error: message },
          { status: 500 },
        );
      }
    } else {
      await inngest.send({
        name: "statements/uploaded",
        data: {
          statementId,
          storagePath,
          trialId,
          filename: file.name,
          bankName,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        statementId,
        message: "File uploaded. Processing started asynchronously.",
      },
      { status: 202 },
    );
  } catch (err: unknown) {
    console.error("Statement upload error:", err);
    return NextResponse.json(
      { error: "Server encountered an unknown error" },
      { status: 500 },
    );
  }
}
