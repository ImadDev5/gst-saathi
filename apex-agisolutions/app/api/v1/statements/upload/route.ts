import { after, NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { inngest } from "@/inngest/client";
import { parseCSV, runStatementPipeline } from "@/inngest/functions";
import { dedupHash } from "@/lib/dedup-hash";

async function processUploadedCsvSynchronously(args: {
  statementId: string;
  trialId: string;
  fileBuffer: ArrayBuffer;
}) {
  const transactions = parseCSV(
    Buffer.from(args.fileBuffer),
    args.statementId,
    args.trialId,
  );

  const rows = transactions.map(({ id: _id, ...txn }) => ({
    ...txn,
    vendor_id: null,
    mapped_vendor_name: null,
    itc_status: "UNKNOWN",
    gst_amount: 0,
    block_reason: null,
    action_required: txn.transaction_type === "DEBIT" ? "Review classification" : null,
    confidence: 0.5,
    rcm_type: null,
    dedupe_hash: dedupHash(
      args.statementId,
      txn.transaction_date,
      txn.description,
      txn.amount,
    ),
  }));

  if (rows.length > 0) {
    const { error } = await supabaseServer
      .from("transactions")
      .upsert(rows, {
        onConflict: "dedupe_hash",
        ignoreDuplicates: true,
      });

    if (error) {
      throw new Error(`Failed to insert parsed transactions: ${error.message}`);
    }
  }

  const { error: statementError } = await supabaseServer
    .from("statements")
    .update({
      status: "COMPLETED",
      error_message: null,
    })
    .eq("id", args.statementId);

  if (statementError) {
    throw new Error(`Failed to update statement status: ${statementError.message}`);
  }
}

function shouldUseLocalAsyncProcessing() {
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(process.env.INNGEST_DEV) &&
    process.env.SYNC_STATEMENT_PROCESSING !== "1" &&
    process.env.LOCAL_ASYNC_STATEMENT_PROCESSING !== "0"
  );
}

function processUploadedStatementLocally(args: {
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
          : "Local async statement processing failed";

      console.error("Local async statement processing failed:", processingError);

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
    if (process.env.SYNC_STATEMENT_PROCESSING === "1" && fileExt === "csv") {
      try {
        await processUploadedCsvSynchronously({
          statementId,
          trialId,
          fileBuffer,
        });
      } catch (processingError) {
        const message =
          processingError instanceof Error
            ? processingError.message
            : "Synchronous statement processing failed";

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
    } else if (shouldUseLocalAsyncProcessing()) {
      processUploadedStatementLocally({
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
