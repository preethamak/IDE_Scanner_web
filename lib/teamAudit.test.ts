import { describe, expect, it } from "vitest";
import {
  auditManifest,
  filterTeamAuditEvents,
  teamAuditCsv,
  type TeamAuditEvent,
} from "@/lib/teamAudit";

const events: TeamAuditEvent[] = [
  {
    event_id: "event-1",
    workspace_id: "team-1",
    actor_id: "user-1",
    action: "resolved",
    object_type: "decision",
    object_id: "decision-1",
    extension_id: "publisher.extension",
    version: "2.0.0",
    previous_state: { decision: "review" },
    resulting_state: { decision: "allow" },
    rationale: 'Reviewed, "approved"',
    risk_level: "LOW",
    receipt_id: "event-1",
    occurred_at: "2026-08-06T12:00:00.000Z",
  },
  {
    event_id: "event-2",
    workspace_id: "team-1",
    actor_id: null,
    action: "delivery_failed",
    object_type: "notification",
    object_id: "delivery-1",
    extension_id: "other.tool",
    version: "1.0.0",
    previous_state: null,
    resulting_state: { status: "failed" },
    rationale: null,
    risk_level: "HIGH",
    receipt_id: "event-2",
    occurred_at: "2026-08-05T12:00:00.000Z",
  },
];

describe("team audit exports", () => {
  it("filters normalized events without exposing unrelated records", () => {
    expect(
      filterTeamAuditEvents(events, {
        actor: "user-1",
        extension: "publisher",
        eventType: "decision",
        version: "2.0.0",
        decision: "allow",
      }),
    ).toEqual([events[0]]);
  });

  it("filters delivery state, risk, and date boundaries", () => {
    expect(
      filterTeamAuditEvents(events, {
        deliveryStatus: "failed",
        risk: "high",
        from: "2026-08-05T00:00:00.000Z",
        to: "2026-08-05T23:59:59.999Z",
      }),
    ).toEqual([events[1]]);
  });

  it("creates stable integrity hashes for identical event payloads", () => {
    expect(auditManifest("team-1", events).sha256).toBe(
      auditManifest("team-1", events).sha256,
    );
    expect(auditManifest("team-1", events).sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("escapes CSV values and includes state snapshots", () => {
    const csv = teamAuditCsv(events);
    expect(csv).toContain('"Reviewed, ""approved"""');
    expect(csv).toContain('"{ "'.replace(" ", ""));
    expect(csv.split("\n")).toHaveLength(3);
  });
});
