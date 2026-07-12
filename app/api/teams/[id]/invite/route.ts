import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { user } = await authenticated(request); const { id } = await context.params; const membership = await serviceDb().from("team_members").select("role").eq("team_id", id).eq("user_id", user.id).maybeSingle(); if (membership.data?.role !== "owner") throw new Error("Only team owners can create invitations."); const token = randomBytes(24).toString("base64url"); const tokenHash = createHash("sha256").update(token).digest("hex"); const expires = new Date(Date.now() + 7 * 86400000).toISOString(); const result = await serviceDb().from("team_invitations").insert({ team_id: id, token_hash: tokenHash, expires_at: expires, created_by: user.id }).select("id,expires_at").single(); if (result.error) throw result.error; return NextResponse.json({ ...result.data, invite_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner-web.vercel.app"}/account?invite=${token}` }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation creation failed." }, { status: 403 }); }
}
