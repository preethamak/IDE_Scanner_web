import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole, teamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

const DAY = 24 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const { data, error } = await serviceDb().from("team_invitations").select("id,role,expires_at,accepted_at,created_at").eq("team_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ invitations: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation lookup failed." }, { status: 403 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json(); const role = teamRole(body.role);
    const expiresInDays = Number(body.expires_in_days ?? 7);
    if (!role || role === "owner" || !Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      return NextResponse.json({ error: "Choose a non-owner role and an expiry between 1 and 30 days." }, { status: 400 });
    }
    const token = randomBytes(32).toString("base64url");
    const { data, error } = await serviceDb().from("team_invitations").insert({ team_id: id, token_hash: tokenHash(token), role, expires_at: new Date(Date.now() + expiresInDays * DAY).toISOString(), created_by: user.id }).select("id,role,expires_at,created_at").single();
    if (error) throw error;
    return NextResponse.json({ invitation: data, invitation_path: `/workspace/invitations/${token}` }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create invitation." }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const invitationId = new URL(request.url).searchParams.get("invitation_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(invitationId)) return NextResponse.json({ error: "A valid invitation id is required." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_invitations").delete().eq("id", invitationId).eq("team_id", id).is("accepted_at", null).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Pending invitation not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invitation revocation failed." }, { status: 403 }); }
}
