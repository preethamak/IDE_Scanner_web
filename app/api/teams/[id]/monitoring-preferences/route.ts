import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

const booleanFields = [
  "release_alerts",
  "scan_alerts",
  "decision_alerts",
  "high_evidence_alerts",
  "provenance_alerts",
  "coverage_alerts",
  "due_alerts",
  "weekly_digest",
] as const;
type BooleanField = (typeof booleanFields)[number];
const defaults: Record<BooleanField, boolean> & {
  digest_weekday: number;
  digest_hour_utc: number;
} = {
  release_alerts: true,
  scan_alerts: true,
  decision_alerts: true,
  high_evidence_alerts: true,
  provenance_alerts: true,
  coverage_alerts: true,
  due_alerts: true,
  weekly_digest: false,
  digest_weekday: 1,
  digest_hour_utc: 9,
};
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb()
      .from("team_monitoring_preferences")
      .select("*")
      .eq("team_id", id)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ team_id: id, ...defaults, ...(data || {}) });
  } catch (error) {
    const failure = teamApiError(
      error,
      "Monitoring preferences are temporarily unavailable.",
    );
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const body = await request.json().catch(() => ({}));
    const patch: Record<string, boolean | number> = {};
    for (const field of booleanFields) {
      if (!(field in body)) continue;
      if (typeof body[field] !== "boolean")
        return NextResponse.json(
          { error: `${field} must be a boolean.` },
          { status: 400 },
        );
      patch[field] = body[field];
    }
    if ("digest_weekday" in body) {
      if (
        !Number.isInteger(body.digest_weekday) ||
        body.digest_weekday < 1 ||
        body.digest_weekday > 7
      )
        return NextResponse.json(
          { error: "digest_weekday must be an integer from 1 to 7." },
          { status: 400 },
        );
      patch.digest_weekday = body.digest_weekday;
    }
    if ("digest_hour_utc" in body) {
      if (
        !Number.isInteger(body.digest_hour_utc) ||
        body.digest_hour_utc < 0 ||
        body.digest_hour_utc > 23
      )
        return NextResponse.json(
          { error: "digest_hour_utc must be an integer from 0 to 23." },
          { status: 400 },
        );
      patch.digest_hour_utc = body.digest_hour_utc;
    }
    if (!Object.keys(patch).length)
      return NextResponse.json(
        { error: "At least one monitoring preference is required." },
        { status: 400 },
      );
    const { data, error } = await serviceDb()
      .from("team_monitoring_preferences")
      .upsert(
        { team_id: id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "team_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    const failure = teamApiError(
      error,
      "Monitoring preferences could not be updated.",
    );
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}
