import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase";
import { requireEntitlement } from "@/lib/entitlements";

export async function POST(request: Request) {
  try {
    const { user } = await authenticated(request);
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({ error: "Invitation is invalid." }, { status: 400 });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await serviceDb().from("team_invitations").select("team_id").eq("token_hash", tokenHash).is("accepted_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (invitation.error) throw invitation.error;
    if (!invitation.data) return NextResponse.json({ error: "Invitation is invalid or expired." }, { status: 400 });
    await requireEntitlement(invitation.data.team_id, "team_members", 1);
    const { data, error } = await serviceDb().rpc("accept_team_invitation", { p_token_hash: tokenHash, p_user_id: user.id }).single();
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invitation acceptance returned an invalid workspace.");
    }
    const accepted = data as Record<string, unknown>;
    if (typeof accepted.team_id !== "string" || typeof accepted.role !== "string") {
      throw new Error("Invitation acceptance returned an invalid workspace.");
    }
    return NextResponse.json({ team_id: accepted.team_id, role: accepted.role });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not accept invitation." }, { status: 400 }); }
}
