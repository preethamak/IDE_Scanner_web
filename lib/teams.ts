import { serviceDb } from "@/lib/supabase";

export const teamRoles = ["owner", "admin", "analyst", "viewer"] as const;
export const teamDecisions = ["allow", "review", "block", "exception"] as const;
export type TeamRole = (typeof teamRoles)[number];
export type TeamDecision = (typeof teamDecisions)[number];

export function teamRole(value: unknown): TeamRole | null {
  return teamRoles.includes(value as TeamRole) ? value as TeamRole : null;
}

export function teamDecision(value: unknown): TeamDecision | null {
  return teamDecisions.includes(value as TeamDecision) ? value as TeamDecision : null;
}

export async function requireTeamRole(teamId: string, userId: string, allowed: readonly TeamRole[]): Promise<TeamRole> {
  const { data, error } = await serviceDb().from("team_members").select("role").eq("team_id", teamId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const role = teamRole(data?.role);
  if (!role || !allowed.includes(role)) throw new Error("You do not have permission for this team.");
  return role;
}

export async function teamExists(teamId: string): Promise<boolean> {
  const { data, error } = await serviceDb().from("teams").select("id").eq("id", teamId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export function asUuid(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}
