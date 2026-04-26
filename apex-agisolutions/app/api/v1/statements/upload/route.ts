import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import Papa from "papaparse";

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bankName = formData.get("bankName") as string;
    const trialToken = req.cookies.get("trial_token")?.value;

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

    // Step 1: Validate Trial Token
    const { data: trialSession, error: trialError } = await supabaseServer
      .from("trial_sessions")
      .select("id, status")
      .eq("token", trialToken)
      .single();

    if (trialError || !trialSession || trialSession.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Invalid or expired trial token" },
        { status: 401 },
      );
    }

    const trialId = trialSession.id;

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

    // Step 3: Insert Statement Record
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

    // Step 4: Inline CSV Parsing & Transaction Insertion
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(fileBuffer).replace(/^\uFEFF/, "");
      console.log("CSV text length:", text.length, "first 100 chars:", text.substring(0, 100));
      
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim() });
      const rows = parsed.data as Record<string, string>[];
      
      console.log("Parsed rows:", rows.length, "headers:", parsed.meta.fields);

      if (rows.length > 0) {
        // Load vendor rules
        const { data: vendors } = await supabaseServer
          .from("vendors")
          .select("id, name, keywords, itc_status, default_gst_rate");

        const vendorList = vendors || [];

        const transactions = rows.map((row, i) => {
          const rawDate =
            row["Transaction Date"] ||
            row["Date"] ||
            row["transaction_date"] ||
            new Date().toISOString();
          const description =
            row["Description"] ||
            row["Narration"] ||
            row["Particulars"] ||
            "Unknown";
          const debitAmount = parseFloat(
            (row["Withdrawal (INR)"] || row["Debit Amount"] || "0").replace(
              /,/g,
              "",
            ),
          );
          const creditAmount = parseFloat(
            (row["Deposit (INR)"] || row["Credit Amount"] || "0").replace(
              /,/g,
              "",
            ),
          );

          const amount = Math.round(
            (debitAmount > 0 ? debitAmount : creditAmount) * 100,
          );
          const txType = debitAmount > 0 ? "DEBIT" : "CREDIT";

          // Vendor matching via keywords
          const descUpper = description.toUpperCase();
          const matchedVendor = vendorList.find((v) =>
            (v.keywords || []).some((kw: string) =>
              descUpper.includes(kw.toUpperCase()),
            ),
          );

          const itcStatus = matchedVendor?.itc_status || "UNKNOWN";
          const gstRate = matchedVendor?.default_gst_rate || 18;
          const gstRatio = gstRate / (100 + gstRate);
          const gstAmount =
            txType === "DEBIT" && itcStatus !== "UNKNOWN"
              ? Math.round(amount * gstRatio)
              : 0;

          return {
            statement_id: statementId,
            trial_id: trialId,
            transaction_date: rawDate,
            description,
            amount,
            transaction_type: txType,
            vendor_id: matchedVendor?.id || null,
            mapped_vendor_name: matchedVendor?.name || null,
            itc_status: itcStatus,
            gst_amount: gstAmount,
            block_reason:
              itcStatus === "BLOCKED"
                ? "Matched Vendor configured as Blocked Credit under S.17(5)"
                : null,
            dedupe_hash: `${statementId}_${i}_${crypto.randomUUID()}`,
          };
        });

        // Batch insert in chunks for large files (prevents timeout)
        const chunkSize = 100;
        for (let i = 0; i < transactions.length; i += chunkSize) {
          const chunk = transactions.slice(i, i + chunkSize);
          const { error: txError } = await supabaseServer
            .from("transactions")
            .insert(chunk);
          if (txError) {
            console.error(`Transaction insert error at chunk ${i}:`, txError);
          }
        }
      }
    } catch (parseErr) {
      console.error("CSV parsing error:", parseErr);
    }

    // Step 5: Mark as completed
    await supabaseServer
      .from("statements")
      .update({ status: "COMPLETED" })
      .eq("id", statementId);

    return NextResponse.json(
      {
        success: true,
        statementId,
        message: "File uploaded and processed successfully.",
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("Statement upload error:", err);
    return NextResponse.json(
      { error: "Server encountered an unknown error" },
      { status: 500 },
    );
  }
}
