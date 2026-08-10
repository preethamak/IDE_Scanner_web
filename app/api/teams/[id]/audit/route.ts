import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import {
  auditManifest,
  filterTeamAuditEvents,
  teamAuditCsv,
  type TeamAuditEvent,
} from "@/lib/teamAudit";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { auditRetentionCutoff, requireEntitlement, workspaceEntitlements } from "@/lib/entitlements";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
type Row = Record<string, unknown>;

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    const role = await requireTeamRole(id, user.id, [
      "owner",
      "admin",
      "analyst",
      "viewer",
    ]);
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "json";
    const wantsDownload =
      format === "csv" || url.searchParams.get("download") === "1";
    if (wantsDownload && role === "viewer") {
      return NextResponse.json(
        { error: "Viewer access does not include audit export." },
        { status: 403 },
      );
    }
    if (wantsDownload) await requireEntitlement(id, "audit_export");
    const entitlements = await workspaceEntitlements(id);
    const retentionDays = entitlements.limits.audit_retention_days;
    const retainedSince = auditRetentionCutoff(retentionDays);

    const db = serviceDb();
    const [decisions, alerts, deliveries, digests, domainEvents] =
      await Promise.all([
        db
          .from("team_decisions")
          .select(
            "id,extension_id,version,rationale,team_decision_events(id,actor_id,kind,before_value,after_value,created_at)",
          )
          .eq("team_id", id)
          .gte("team_decision_events.created_at", retainedSince)
          .limit(500),
        db
          .from("team_monitoring_alerts")
          .select(
            "id,kind,title,extension_id,version,severity,state,metadata,created_at,resolved_at",
          )
          .eq("team_id", id)
          .gte("created_at", retainedSince)
          .order("created_at", { ascending: false })
          .limit(500),
        db
          .from("team_notification_deliveries")
          .select(
            "id,status,attempts,delivered_at,last_error,created_at,team_monitoring_alerts(extension_id,version,severity)",
          )
          .eq("team_id", id)
          .gte("created_at", retainedSince)
          .order("created_at", { ascending: false })
          .limit(500),
        db
          .from("team_digest_deliveries")
          .select(
            "id,status,attempts,delivered_at,last_error,period_start,period_end,created_at,snapshot",
          )
          .eq("team_id", id)
          .gte("created_at", retainedSince)
          .order("created_at", { ascending: false })
          .limit(250),
        db
          .from("team_audit_events")
          .select(
            "id,actor_id,action,object_type,object_id,extension_id,version,previous_state,resulting_state,rationale,risk_level,created_at",
          )
          .eq("team_id", id)
          .gte("created_at", retainedSince)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
    const failure = [decisions, alerts, deliveries, digests, domainEvents].find(
      (result) => result.error,
    );
    if (failure?.error) throw failure.error;

    const events = filterTeamAuditEvents(
      normalizeEvents(id, {
        decisions: decisions.data || [],
        alerts: alerts.data || [],
        deliveries: deliveries.data || [],
        digests: digests.data || [],
        domainEvents: domainEvents.data || [],
      }),
      {
        actor: url.searchParams.get("actor") || undefined,
        extension: url.searchParams.get("extension") || undefined,
        version: url.searchParams.get("version") || undefined,
        eventType: url.searchParams.get("event_type") || undefined,
        risk: url.searchParams.get("risk") || undefined,
        decision: url.searchParams.get("decision") || undefined,
        deliveryStatus: url.searchParams.get("delivery_status") || undefined,
        from: url.searchParams.get("from") || undefined,
        to: url.searchParams.get("to") || undefined,
      },
    );
    const visibleEvents =
      role === "analyst"
        ? events.filter((event) =>
            ["decision", "monitoring"].includes(event.object_type),
          )
        : events;
    const manifest = auditManifest(id, visibleEvents);

    if (format === "csv") {
      return new Response(teamAuditCsv(visibleEvents), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="guardrails-audit-${id}.csv"`,
          "X-GuardRails-SHA256": manifest.sha256,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return NextResponse.json(
      {
        manifest,
        events: visibleEvents,
        retention: { days: retentionDays, retained_since: retainedSince },
      },
      {
        headers: wantsDownload
          ? {
              "Content-Disposition": `attachment; filename="guardrails-audit-${id}.json"`,
              "Cache-Control": "private, no-store",
            }
          : { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    const failure = teamApiError(
      error,
      "Workspace audit history is temporarily unavailable.",
    );
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status },
    );
  }
}

function normalizeEvents(
  workspaceId: string,
  sources: {
    decisions: Row[];
    alerts: Row[];
    deliveries: Row[];
    digests: Row[];
    domainEvents: Row[];
  },
): TeamAuditEvent[] {
  const events: TeamAuditEvent[] = [];
  for (const event of sources.domainEvents) {
    const objectType = domainObjectType(event.object_type);
    events.push({
      event_id: String(event.id),
      workspace_id: workspaceId,
      actor_id: text(event.actor_id),
      action: `${objectType}_${String(event.action)}`,
      object_type: objectType,
      object_id: String(event.object_id),
      extension_id: text(event.extension_id),
      version: text(event.version),
      previous_state: nullableObject(event.previous_state),
      resulting_state: nullableObject(event.resulting_state),
      rationale: text(event.rationale),
      risk_level: text(event.risk_level),
      receipt_id: String(event.id),
      occurred_at: String(event.created_at),
    });
  }
  for (const decision of sources.decisions) {
    for (const event of many(decision.team_decision_events)) {
      const after = object(event.after_value);
      events.push({
        event_id: String(event.id),
        workspace_id: workspaceId,
        actor_id: text(event.actor_id),
        action: String(event.kind || "decision_updated"),
        object_type: "decision",
        object_id: String(decision.id),
        extension_id: text(decision.extension_id),
        version: text(decision.version),
        previous_state: object(event.before_value),
        resulting_state: after,
        rationale: text(after.rationale) || text(decision.rationale),
        risk_level: null,
        receipt_id: String(event.id),
        occurred_at: String(event.created_at),
      });
    }
  }
  for (const alert of sources.alerts) {
    events.push({
      event_id: String(alert.id),
      workspace_id: workspaceId,
      actor_id: null,
      action: String(alert.kind || "monitoring_alert"),
      object_type: "monitoring",
      object_id: String(alert.id),
      extension_id: text(alert.extension_id),
      version: text(alert.version),
      previous_state: null,
      resulting_state: { state: alert.state, metadata: object(alert.metadata) },
      rationale: text(alert.title),
      risk_level: text(alert.severity),
      receipt_id: String(alert.id),
      occurred_at: String(alert.created_at),
    });
  }
  for (const delivery of sources.deliveries) {
    const alert = one(delivery.team_monitoring_alerts);
    events.push({
      event_id: String(delivery.id),
      workspace_id: workspaceId,
      actor_id: null,
      action: `delivery_${String(delivery.status || "unknown")}`,
      object_type: "notification",
      object_id: String(delivery.id),
      extension_id: text(alert.extension_id),
      version: text(alert.version),
      previous_state: null,
      resulting_state: {
        status: delivery.status,
        attempts: delivery.attempts,
        delivered_at: delivery.delivered_at,
        error: delivery.last_error,
      },
      rationale: null,
      risk_level: text(alert.severity),
      receipt_id: String(delivery.id),
      occurred_at: String(delivery.delivered_at || delivery.created_at),
    });
  }
  for (const digest of sources.digests) {
    events.push({
      event_id: String(digest.id),
      workspace_id: workspaceId,
      actor_id: null,
      action: `digest_${String(digest.status || "unknown")}`,
      object_type: "digest",
      object_id: String(digest.id),
      extension_id: null,
      version: null,
      previous_state: null,
      resulting_state: {
        status: digest.status,
        attempts: digest.attempts,
        period_start: digest.period_start,
        period_end: digest.period_end,
        snapshot: object(digest.snapshot),
        error: digest.last_error,
      },
      rationale: null,
      risk_level: null,
      receipt_id: String(digest.id),
      occurred_at: String(digest.delivered_at || digest.created_at),
    });
  }
  return events;
}

function many(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}
function one(value: unknown): Row {
  return Array.isArray(value) ? ((value[0] || {}) as Row) : object(value);
}
function object(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}
function nullableObject(value: unknown): Row | null {
  const result = object(value);
  return Object.keys(result).length ? result : null;
}
function text(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
function domainObjectType(value: unknown): TeamAuditEvent["object_type"] {
  const mapping: Record<string, TeamAuditEvent["object_type"]> = {
    team_members: "membership",
    team_invitations: "invitation",
    team_watchlist_items: "watchlist",
    team_notification_channels: "channel",
    team_monitoring_preferences: "preference",
    team_monitoring_alerts: "monitoring",
  };
  return mapping[String(value)] || "monitoring";
}
