import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const route = readFileSync(
  join(process.cwd(), "app/api/teams/[id]/decisions/route.ts"),
  "utf8",
);
const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260828170607_record_team_decision_atomically.sql",
  ),
  "utf8",
);

describe("atomic team decision mutation", () => {
  it("uses one database mutation rather than separate decision, event, and alert writes", () => {
    expect(route).toContain('rpc("record_team_decision_atomically"');
    expect(route).not.toContain('.from("team_decision_events").insert');
    expect(route).not.toContain('.from("team_monitoring_alerts").upsert');
  });

  it("locks the workspace, validates membership, and restricts RPC execution", () => {
    expect(migration).toContain("from public.teams where id = target_team for update");
    expect(migration).toContain("actor_role not in ('owner', 'admin', 'analyst')");
    expect(migration).toContain("revoke all on function public.record_team_decision_atomically");
    expect(migration).toContain("to service_role");
  });

  it("does not duplicate decision events when a completed request is retried", () => {
    expect(migration).toContain("unchanged := before_value is not null and before_value = after_value");
    expect(migration).toContain("if unchanged then");
  });
});
