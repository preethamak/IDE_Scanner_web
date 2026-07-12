import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try { const { user } = await authenticated(request); const { token } = await context.params; const hash = createHash("sha256").update(token).digest("hex"); const admin = serviceDb(); const invitation = await admin.from("team_invitations").select("*").eq("token_hash", hash).is("accepted_at", null).gt("expires_at", new Date().toISOString()).maybeSingle(); if (!invitation.data) throw new Error("Invitation is invalid or expired."); const membership = await admin.from("team_members").upsert({ team_id: invitation.data.team_id, user_id: user.id, role: invitation.data.role }); if (membership.error) throw membership.error; await admin.from("team_invitations").update({ accepted_at: new Date().toISOString() }).eq("id", invitation.data.id); return NextResponse.json({ team_id: invitation.data.team_id }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation could not be accepted." }, { status: 400 }); }
}
