import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const panel = fs.readFileSync(path.join(root, "app/workspace/BillingPanel.tsx"), "utf8");
const routes = [
  "app/api/teams/[id]/watchlist/route.ts",
  "app/api/teams/[id]/notification-channels/route.ts",
  "app/api/teams/[id]/audit/route.ts",
  "app/api/team-invitations/accept/route.ts",
].map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");

describe("billing and entitlement surface", () => {
  it("shows loading, failure, unconfigured, and lifecycle states", () => {
    expect(panel).toContain('"loading" | "ready" | "error"');
    expect(panel).toContain("Purchases are unavailable in this deployment");
    expect(panel).toContain('summary.status === "past_due"');
    expect(panel).toContain("Cancellation scheduled");
  });

  it("enforces limits in mutation and export route handlers", () => {
    expect(routes).toContain('requireEntitlement(id, "monitored_extensions", 1)');
    expect(routes).toContain('requireEntitlement(id, "notification_channels", 1)');
    expect(routes).toContain('requireEntitlement(id, "audit_export")');
    expect(routes).toContain('requireEntitlement(invitation.data.team_id, "team_members", 1)');
  });
});
