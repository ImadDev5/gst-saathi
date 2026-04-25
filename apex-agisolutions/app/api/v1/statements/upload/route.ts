import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { inngest } from "@/inngest/client";

export const maxDuration = 60; // Max timeout for file handling

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bankName = formData.get("bankName") as string;
    const trialToken = formData.get("trialToken") as string;

    if (!file || !bankName || !trialToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Step 1: Validate Trial Token
    // (mock validation for now, will pull from `trial_sessions` table)
    const { data: trialSession, error: trialError } = await supabaseServer
      .from("trial_sessions")
      .select("id, status")
      .eq("token", trialToken)
      .single();

    if (trialError || !trialSession || trialSession.status !== 'ACTIVE') {
      return NextResponse.json({ error: "Invalid or expired trial token" }, { status: 401 });
    }

    // Step 2: Upload File to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const storagePath = `${trialSession.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("statements") // Ensure this bucket exists in Supabase dashboard
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    // Step 3: Insert Initial Record to Statements Table
    const { data: statement, error: dbError } = await supabaseServer
      .from("statements")
      .insert({
        trial_id: trialSession.id,
        filename: file.name,
        bank_name: bankName,
        status: "PROCESSING",
      })
      .select()
      .single();

    if (dbError || !statement) {
      console.error("DB Error:", dbError);
      return NextResponse.json({ error: "Failed to track statement in Database" }, { status: 500 });
    }

    // Step 4: Dispatch Event to Inngest for Background Parsing
    await inngest.send({
      name: "statements/uploaded",
      data: {
        statementId: statement.id,
        storagePath: storagePath,
        fileType: fileExt,
        bankName: bankName,
        trialId: trialSession.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      statementId: statement.id, 
      message: "File processing triggered successfully." 
    }, { status: 202 });

  } catch (err: unknown) {
    console.error("Statement upload error:", err);
    return NextResponse.json({ error: "Server encountered an unknown error" }, { status: 500 });
  }
}