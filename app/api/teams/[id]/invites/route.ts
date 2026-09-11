import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole, teamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";
import { newId, nowIso, privateDb } from "@/lib/cloudflarePrivate";

const DAY = 24 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, provider } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    if (provider === "cloudflare") {
      const rows = await privateDb().prepare("SELECT id,role,expires_at,accepted_at,created_at FROM app_team_invitations WHERE team_id=? ORDER BY created_at DESC").bind(id).all<Record<string, unknown>>();
      return NextResponse.json({ invitations: rows.results });
    }
    const { data, error } = await serviceDb().from("team_invitations").select("id,role,expires_at,accepted_at,created_at").eq("team_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ invitations: data || [] });
  } catch (error) {
    const failure = teamApiError(error, "Invitations are temporarily unavailable. Please try again.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, provider } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json(); const role = teamRole(body.role);
    const expiresInDays = Number(body.expires_in_days ?? 7);
    if (!role || role === "owner" || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      return NextResponse.json({ error: "Choose a non-owner role and an expiry between 1 and 30 days." }, { status: 400 });
    }
    const token = randomBytes(32).toString("base64url");
    if (provider === "cloudflare") {
      const invitation = { id: newId(), team_id: id, role, expires_at: new Date(Date.now() + expiresInDays * DAY).toISOString(), accepted_at: null, created_at: nowIso(), token_hash: tokenHash(token), created_by: user.id };
      await privateDb().prepare("INSERT INTO app_team_invitations(id,team_id,token_hash,role,expires_at,accepted_at,created_by,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(invitation.id, invitation.team_id, invitation.token_hash, invitation.role, invitation.expires_at, null, invitation.created_by, invitation.created_at).run();
      const { token_hash: _tokenHash, team_id: _teamId, created_by: _createdBy, ...safeInvitation } = invitation;
      return NextResponse.json({ invitation: safeInvitation, invitation_path: `/workspace/invitations/${token}` }, { status: 201 });
    }
    const { data, error } = await serviceDb().from("team_invitations").insert({ team_id: id, token_hash: tokenHash(token), role, expires_at: new Date(Date.now() + expiresInDays * DAY).toISOString(), created_by: user.id }).select("id,role,expires_at,created_at").single();
    if (error) throw error;
    return NextResponse.json({ invitation: data, invitation_path: `/workspace/invitations/${token}` }, { status: 201 });
  } catch (error) {
    const failure = teamApiError(error, "Could not create the invitation. Please try again.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, provider } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const invitationId = new URL(request.url).searchParams.get("invitation_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(invitationId)) return NextResponse.json({ error: "A valid invitation id is required." }, { status: 400 });
    if (provider === "cloudflare") {
      const result = await privateDb().prepare("DELETE FROM app_team_invitations WHERE id=? AND team_id=? AND accepted_at IS NULL").bind(invitationId, id).run();
      if (Number(result.meta?.changes || 0) < 1) return NextResponse.json({ error: "Pending invitation not found." }, { status: 404 });
      return new NextResponse(null, { status: 204 });
    }
    const { data, error } = await serviceDb().from("team_invitations").delete().eq("id", invitationId).eq("team_id", id).is("accepted_at", null).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Pending invitation not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const failure = teamApiError(error, "Could not revoke the invitation. Please try again.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
