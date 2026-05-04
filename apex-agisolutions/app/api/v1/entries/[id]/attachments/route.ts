import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

/**
 * POST /api/v1/entries/[id]/attachments — Upload invoice file
 * GET  /api/v1/entries/[id]/attachments — List attachments with signed URLs
 */

async function getSession(token: string | undefined) {
  if (!token) return null;
  const { data } = await supabaseServer
    .from("trial_sessions").select("id").eq("token", token).eq("status", "ACTIVE").single();
  return data;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check entry exists
    const { data: entry } = await supabaseServer
      .from("entries")
      .select("id, entry_type, has_invoice, trial_id")
      .eq("id", id)
      .eq("trial_id", session.id)
      .is("deleted_at", null)
      .single();

    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF",
      }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop() || "pdf";
    const storagePath = `${session.id}/${id}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage bucket "invoices"
    const { error: uploadError } = await supabaseServer
      .storage
      .from("invoices")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    // Insert attachment record
    const { data: attachment, error: insertError } = await supabaseServer
      .from("entry_attachments")
      .insert({
        entry_id: id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Mark entry as having invoice
    if (!entry.has_invoice) {
      await supabaseServer
        .from("entries")
        .update({ has_invoice: true })
        .eq("id", id);
    }

    // Audit log
    await supabaseServer.from("audit_logs").insert({
      trial_id: session.id,
      entity_type: 'ATTACHMENT',
      entity_id: id,
      action: 'CREATE',
      field_name: 'file_name',
      new_value: file.name,
      user_agent: req.headers.get("user-agent") || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: attachment.id,
        file_name: attachment.file_name,
        file_size: attachment.file_size,
        mime_type: attachment.mime_type,
        uploaded_at: attachment.uploaded_at,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("Attachment upload error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = req.cookies.get("trial_token")?.value;
    const session = await getSession(token);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: attachments, error } = await supabaseServer
      .from("entry_attachments")
      .select("*")
      .eq("entry_id", id)
      .order("uploaded_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Generate signed URLs (1 hour expiry)
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (att: any) => {
        try {
          const { data: signedData } = await supabaseServer
            .storage
            .from("invoices")
            .createSignedUrl(att.storage_path, 3600);

          return {
            ...att,
            storage_url: signedData?.signedUrl || null,
            storage_path: undefined, // never expose raw path
          };
        } catch {
          return { ...att, storage_url: null, storage_path: undefined };
        }
      }),
    );

    return NextResponse.json({
      success: true,
      data: attachmentsWithUrls,
    });
  } catch (err) {
    console.error("Attachment list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
