import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/client";

async function verifyAdmin(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return false;
  const { data } = await supabaseServer
    .from("admin_sessions")
    .select("id")
    .eq("token", token)
    .single();
  return !!data;
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json(
      { error: "contactId required" },
      { status: 400 }
    );
  }

  const { data: contact } = await supabaseServer
    .from("contacts")
    .select("id, email, assigned_token")
    .eq("id", contactId)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.assigned_token) {
    return NextResponse.json(
      { error: "Token already assigned to this contact" },
      { status: 409 }
    );
  }

  const trialToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const { data: trialSession, error: trialError } = await supabaseServer
    .from("trial_sessions")
    .insert([
      {
        token: trialToken,
        status: "ACTIVE",
        expires_at: expiresAt.toISOString(),
      },
    ])
    .select("id")
    .single();

  if (trialError) {
    console.error("Create trial session error:", trialError);
    return NextResponse.json(
      { error: trialError.message },
      { status: 500 }
    );
  }

  await supabaseServer
    .from("contacts")
    .update({
      assigned_token: trialToken,
      token_assigned_at: new Date().toISOString(),
      status: "ASSIGNED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);

  await supabaseServer.from("contact_tokens").insert([
    {
      contact_id: contactId,
      trial_session_id: trialSession.id,
    },
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const tokenUrl = `${baseUrl}/signin?token=${trialToken}`;

  return NextResponse.json({
    success: true,
    token: trialToken,
    url: tokenUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
