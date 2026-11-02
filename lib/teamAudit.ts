import { createHash } from "node:crypto";

export type TeamAuditEvent = {
  event_id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  object_type:
    | "decision"
    | "monitoring"
    | "notification"
    | "digest"
    | "membership"
    | "invitation"
    | "watchlist"
    | "channel"
    | "preference"
    | "badge"
    | "unknown";
  object_id: string;
  extension_id: string | null;
  version: string | null;
  previous_state: Record<string, unknown> | null;
  resulting_state: Record<string, unknown> | null;
  rationale: string | null;
  risk_level: string | null;
  receipt_id: string;
  occurred_at: string;
};

export type TeamAuditFilters = {
  actor?: string;
  extension?: string;
  version?: string;
  eventType?: string;
  risk?: string;
  decision?: string;
  deliveryStatus?: string;
  from?: string;
  to?: string;
};

export function filterTeamAuditEvents(
  events: TeamAuditEvent[],
  filters: TeamAuditFilters,
) {
  const from = filters.from ? new Date(filters.from).getTime() : null;
  const to = filters.to ? new Date(filters.to).getTime() : null;
  return events
    .filter((event) => !filters.actor || event.actor_id === filters.actor)
    .filter(
      (event) =>
        !filters.extension ||
        event.extension_id
          ?.toLowerCase()
          .includes(filters.extension.toLowerCase()),
    )
    .filter((event) => !filters.version || event.version === filters.version)
    .filter(
      (event) =>
        !filters.eventType ||
        event.object_type === filters.eventType ||
        event.action === filters.eventType,
    )
    .filter(
      (event) =>
        !filters.decision ||
        event.resulting_state?.decision === filters.decision,
    )
    .filter(
      (event) =>
        !filters.deliveryStatus ||
        event.resulting_state?.status === filters.deliveryStatus,
    )
    .filter(
      (event) =>
        !filters.risk ||
        event.risk_level?.toLowerCase() === filters.risk.toLowerCase(),
    )
    .filter(
      (event) => from == null || new Date(event.occurred_at).getTime() >= from,
    )
    .filter(
      (event) => to == null || new Date(event.occurred_at).getTime() <= to,
    )
    .sort(
      (a, b) =>
        b.occurred_at.localeCompare(a.occurred_at) ||
        b.event_id.localeCompare(a.event_id),
    );
}

export function auditManifest(workspaceId: string, events: TeamAuditEvent[]) {
  const canonical = JSON.stringify(events);
  return {
    schema: "guardrails.workspace-audit.v1",
    workspace_id: workspaceId,
    event_count: events.length,
    generated_at: new Date().toISOString(),
    sha256: createHash("sha256").update(canonical).digest("hex"),
  };
}

/**
 * A compact projection of exported audit evidence for review and reporting.
 * It intentionally summarizes recorded events only; it does not infer current
 * extension safety, current alert state, or a workspace-wide security score.
 */
export function teamAuditEvidenceSummary(
  workspaceId: string,
  events: TeamAuditEvent[],
) {
  const byObjectType = countBy(events, (event) => event.object_type);
  const decisions = countBy(
    events.filter((event) => event.object_type === "decision"),
    (event) => String(event.resulting_state?.decision || "unknown").toLowerCase(),
  );
  const deliveryStatuses = countBy(
    events.filter((event) => event.object_type === "notification" || event.object_type === "digest"),
    (event) => String(event.resulting_state?.status || "unknown").toLowerCase(),
  );
  const riskLevels = countBy(
    events.filter((event) => Boolean(event.risk_level)),
    (event) => String(event.risk_level).toLowerCase(),
  );
  const timestamps = events.map((event) => event.occurred_at).filter((value) => !Number.isNaN(new Date(value).getTime())).sort();
  return {
    schema: "guardrails.workspace-audit-evidence-summary.v1",
    workspace_id: workspaceId,
    manifest: auditManifest(workspaceId, events),
    period: { oldest_event_at: timestamps[0] || null, newest_event_at: timestamps.at(-1) || null },
    events: { total: events.length, by_object_type: byObjectType, unique_extensions: new Set(events.map((event) => event.extension_id).filter(Boolean)).size },
    decisions: { recorded: Object.values(decisions).reduce((sum, count) => sum + count, 0), by_outcome: decisions },
    delivery: { recorded: Object.values(deliveryStatuses).reduce((sum, count) => sum + count, 0), by_status: deliveryStatuses },
    risk_evidence: { events_with_risk_level: Object.values(riskLevels).reduce((sum, count) => sum + count, 0), by_level: riskLevels },
    evidence_boundary: "This summary is derived only from the returned audit events and their selected time range. It is historical evidence, not a live posture calculation, approval, or safety score.",
  };
}

function countBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

const csvColumns: Array<keyof TeamAuditEvent> = [
  "event_id",
  "workspace_id",
  "actor_id",
  "action",
  "object_type",
  "object_id",
  "extension_id",
  "version",
  "risk_level",
  "rationale",
  "receipt_id",
  "occurred_at",
  "previous_state",
  "resulting_state",
];

export function teamAuditCsv(events: TeamAuditEvent[]) {
  const rows = events.map((event) =>
    csvColumns.map((column) => csvCell(event[column])).join(","),
  );
  return [csvColumns.join(","), ...rows].join("\n");
}

function csvCell(value: unknown) {
  if (value == null) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
