import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole, teamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { teamApiError } from "@/lib/teamApiError";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
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
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json().catch(() => ({}));
    const memberId = asUuid(body.user_id);
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
