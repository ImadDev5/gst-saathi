import { after, NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { inngest } from "@/inngest/client";
import { runStatementPipeline } from "@/inngest/functions";

function processUploadedStatementInBackground(args: {
  statementId: string;
  storagePath: string;
  trialId: string;
  filename: string;
  bankName: string;
}) {
  after(async () => {
    try {
      await runStatementPipeline(args);
    } catch (processingError) {
      const message =
        processingError instanceof Error
          ? processingError.message
          : "Background statement processing failed";

      console.error("Background statement processing failed:", processingError);

      await supabaseServer
        .from("statements")
        .update({
          status: "FAILED",
          error_message: message,
        })
        .eq("id", args.statementId);
    }
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
    // CSV: run full pipeline (parse + vendor-match + AI classify) via after()
    // so it works on Vercel Hobby without requiring Inngest Cloud.
    // PDF: heavier processing, still route through Inngest if available.
    if (fileExt === "csv") {
      processUploadedStatementInBackground({
        statementId,
        storagePath,
        trialId,
        filename: file.name,
        bankName,
      });
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
