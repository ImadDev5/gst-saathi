import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";
import { inngest } from "@/inngest/client";
import { parseCSV } from "@/inngest/functions";
import { VendorMatcher } from "@/lib/engine/vendor-matcher";
import { detectRCM } from "@/lib/engine/rcm-detector";
import { reverseCalculateGST } from "@/lib/engine/gst-calculator";
import { dedupHash } from "@/lib/dedup-hash";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const bankName = formData.get("bankName") as string;
    const trialToken = req.cookies.get("trial_token")?.value || req.cookies.get("user_session")?.value;

    if (!file || !bankName || !trialToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (fileExt !== "csv" && fileExt !== "pdf") {
      return NextResponse.json({ error: "Only CSV and PDF files are supported" }, { status: 400 });
    }

    // Step 1: Validate Session Token
    let trialId: string;
    const { data: trialSession } = await supabaseServer
      .from("trial_sessions")
      .select("id, status")
      .eq("token", trialToken)
      .single();

    if (trialSession && trialSession.status === "ACTIVE") {
      trialId = trialSession.id;
    } else {
      const { data: userSession, error: userError } = await supabaseServer
        .from("user_sessions")
        .select("id, trial_session_id, status")
        .eq("token", trialToken)
        .single();

      if (userError || !userSession || userSession.status !== "ACTIVE") {
        return NextResponse.json({ error: "Invalid or expired session token" }, { status: 401 });
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
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
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
      return NextResponse.json({ error: "Failed to track statement in Database" }, { status: 500 });
    }

    const statementId = statement.id;

    // Step 4: For CSV, parse + vendor match + insert inline, then send to Inngest for AI only
    if (fileExt === "csv") {
      try {
        const transactions = parseCSV(Buffer.from(fileBuffer), statementId, trialId);

        // Run tier1 vendor matching
        const { data: vendors } = await supabaseServer
          .from("vendors")
          .select("id, name, keywords, itc_status, default_gst_rate, category, is_oidar");
        const vendorMatcher = new VendorMatcher(vendors || []);

        const rows = transactions.map(({ id: _id, ...txn }) => {
          const result: any = {
            ...txn,
            vendor_id: null,
            mapped_vendor_name: null,
            itc_status: "UNKNOWN",
            gst_amount: 0,
            block_reason: null,
            action_required: txn.transaction_type === "DEBIT" ? "Review classification" : null,
            confidence: 0.5,
            rcm_type: null,
            dedupe_hash: dedupHash(statementId, txn.transaction_date, txn.description, txn.amount),
          };

          if (txn.transaction_type === "DEBIT" && txn.amount > 0) {
            const matched = vendorMatcher.match(txn.description);
            if (matched) {
              result.vendor_id = matched.id;
              result.mapped_vendor_name = matched.name;
              const narration = txn.description.toUpperCase();
              const isOidar = (matched.category?.toUpperCase().includes("OIDAR") || false) || (matched.is_oidar || false);
              const rcm = detectRCM(narration, txn.amount, isOidar, isOidar, matched.category || null);

              if (rcm.rcmApplicable) {
                result.itc_status = "RCM";
                result.gst_amount = rcm.rcmAmountPaise;
                result.rcm_type = rcm.rcmType;
                result.action_required = "Pay RCM tax; claim ITC in same month";
                result.confidence = 0.9;
              } else {
                const vendorStatus = matched.itc_status;
                if (vendorStatus === "BLOCKED") {
                  result.itc_status = "BLOCKED";
                  result.block_reason = "Matched Vendor configured as Blocked Credit under S.17(5)";
                  result.confidence = 0.95;
                } else if (vendorStatus === "RCM") {
                  result.itc_status = "RCM";
                  result.action_required = "Pay RCM tax; claim ITC in same month";
                  result.confidence = 0.9;
                } else {
                  result.itc_status = vendorStatus === "ELIGIBLE" ? "ELIGIBLE" : "UNKNOWN";
                  result.confidence = vendorStatus === "ELIGIBLE" ? 0.85 : 0.5;
                  if (result.itc_status === "ELIGIBLE") {
                    result.action_required = "Verify in GSTR-2B portal";
                  }
                }
                if (result.itc_status !== "UNKNOWN") {
                  result.gst_amount = reverseCalculateGST(txn.amount, matched.default_gst_rate || 18);
                }
              }
            }
          }
          return result;
        });

        // Insert tier1 results into DB
        if (rows.length > 0) {
          const { error: insertError } = await supabaseServer
            .from("transactions")
            .upsert(rows, { onConflict: "dedupe_hash", ignoreDuplicates: true });

          if (insertError) {
            throw new Error(`Failed to insert parsed transactions: ${insertError.message}`);
          }
        }

        // Send to Inngest for AI classification only
        await inngest.send({
          name: "statements/need-ai",
          data: { statementId, trialId },
        });
      } catch (processingError) {
        const message = processingError instanceof Error ? processingError.message : "Pre-processing failed";
        console.error("CSV pre-processing error:", processingError);
        await supabaseServer.from("statements").update({ status: "FAILED", error_message: message }).eq("id", statementId);
        return NextResponse.json({ error: message }, { status: 500 });
      }
    } else {
      // PDF: full pipeline via Inngest
      await inngest.send({
        name: "statements/uploaded",
        data: { statementId, storagePath, trialId, filename: file.name, bankName },
      });
    }

    return NextResponse.json(
      { success: true, statementId, message: fileExt === "csv" ? "File parsed. AI classification started." : "File uploaded. Processing started." },
      { status: 202 }
    );
  } catch (err: unknown) {
    console.error("Statement upload error:", err);
    return NextResponse.json({ error: "Server encountered an unknown error" }, { status: 500 });
  }
}
