import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole, teamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { privateDb } from "@/lib/cloudflarePrivate";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (provider === "cloudflare") {
      const rows = await privateDb().prepare("SELECT m.user_id,m.role,u.email,u.display_name FROM app_team_members m JOIN app_users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'analyst' THEN 2 ELSE 3 END,u.display_name").bind(id).all<Record<string, unknown>>();
      return NextResponse.json({ members: rows.results.map((row) => ({ user_id: String(row.user_id), role: String(row.role), profiles: { display_name: String(row.display_name || row.email || row.user_id) } })) });
    }
    const db = serviceDb();
    const { data, error } = await db
      .from("team_members")
      .select("user_id,role")
      .eq("team_id", id)
      .order("role");
    if (error) throw error;
    const memberIds = (data || []).map((member) => member.user_id);
    const { data: profiles, error: profilesError } = memberIds.length
      ? await db.from("profiles").select("id,display_name").in("id", memberIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const names = new Map(
      (profiles || []).map((profile) => [profile.id, profile.display_name]),
    );
    return NextResponse.json({
      members: (data || []).map((member) => ({
        ...member,
        profiles: { display_name: names.get(member.user_id) || null },
      })),
    });
  } catch (error) {
    const failure = teamApiError(
      error,
      "Team members are temporarily unavailable. Please try again.",
    );
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  return mutateMember(request, context, false);
}

export async function DELETE(request: Request, context: Context) {
  return mutateMember(request, context, true);
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Create an expiring invitation instead of adding a member by user id.",
    },
    { status: 405, headers: { Allow: "GET, PATCH, DELETE" } },
  );
}

async function mutateMember(
  request: Request,
  context: Context,
  remove: boolean,
) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json().catch(() => ({}));
    const memberId = provider === "cloudflare"
      ? (typeof body.user_id === "string" && body.user_id.trim().length <= 200 ? body.user_id.trim() : null)
      : asUuid(body.user_id);
    const role = remove ? null : teamRole(body.role);
    if (!memberId || (!remove && !role)) {
      return NextResponse.json(
        {
          error: remove
            ? "Choose a valid member to remove."
            : "Choose a valid member and role.",
        },
        { status: 400 },
      );
    }

    if (provider === "cloudflare") {
      const db = privateDb();
      const target = await db.prepare("SELECT m.user_id,m.role,u.email,u.display_name FROM app_team_members m JOIN app_users u ON u.id=m.user_id WHERE m.team_id=? AND m.user_id=?").bind(id, memberId).first<Record<string, unknown>>();
      if (!target) return NextResponse.json({ error: "The selected member no longer belongs to this workspace." }, { status: 400 });
      const actor = await db.prepare("SELECT role FROM app_team_members WHERE team_id=? AND user_id=?").bind(id, user.id).first<Record<string, unknown>>();
      const actorRole = teamRole(actor?.role);
      const targetRole = teamRole(target.role);
      if (!actorRole || !targetRole) return NextResponse.json({ error: "You no longer have permission to manage workspace members." }, { status: 403 });
      if (actorRole === "admin" && ["owner", "admin"].includes(targetRole)) return NextResponse.json({ error: "Administrators cannot manage owners or other administrators." }, { status: 400 });
      if (remove) {
        if (targetRole === "owner") {
          const owners = await db.prepare("SELECT COUNT(*) AS count FROM app_team_members WHERE team_id=? AND role='owner'").bind(id).first<Record<string, unknown>>();
          if (Number(owners?.count || 0) <= 1) return NextResponse.json({ error: "The final workspace owner cannot be removed or demoted." }, { status: 409 });
        }
        await db.prepare("DELETE FROM app_team_members WHERE team_id=? AND user_id=?").bind(id, memberId).run();
        const state = await getWorkspaceState(id);
        state.members = state.members.filter((member) => String(member.user_id) !== memberId);
        await saveState(id, state);
        return NextResponse.json({ removed: true, user_id: memberId });
      }
      if (!role) return NextResponse.json({ error: "Choose a valid member and role." }, { status: 400 });
      if (targetRole === "owner" && role !== "owner" && actorRole !== "owner") return NextResponse.json({ error: "Only the workspace owner can change an owner role." }, { status: 403 });
      if (role === "owner" && actorRole !== "owner") return NextResponse.json({ error: "Only the workspace owner can assign the owner role." }, { status: 403 });
      await db.prepare("UPDATE app_team_members SET role=? WHERE team_id=? AND user_id=?").bind(role, id, memberId).run();
      const state = await getWorkspaceState(id);
      const member = state.members.find((item) => String(item.user_id) === memberId);
      if (member) member.role = role;
      await saveState(id, state);
      return NextResponse.json({ member: { user_id: memberId, role, profiles: { display_name: String(target.display_name || target.email || memberId) } } });
    }
    const { data, error } = await serviceDb().rpc("manage_team_member", {
      target_team: id,
      actor: user.id,
      subject: memberId,
      desired_role: role,
    });
    if (error) return memberMutationFailure(error);
    return NextResponse.json({ member: data });
  } catch (error) {
    const failure = teamApiError(
      error,
      "The membership change could not be completed. Please try again.",
    );
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

function memberMutationFailure(error: { message?: string }) {
  const message = error.message || "Membership update failed.";
  const known = [
    "The final workspace owner cannot be removed or demoted.",
    "Administrators cannot manage owners or other administrators.",
    "The selected member no longer belongs to this workspace.",
    "You no longer have permission to manage workspace members.",
  ].find((value) => message.includes(value));
  return NextResponse.json(
    { error: known || "The membership change could not be completed." },
    { status: known?.startsWith("The final") ? 409 : 400 },
  );
}
