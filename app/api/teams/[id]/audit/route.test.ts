import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTeamRole: vi.fn(),
  serviceDb: vi.fn(),
  gte: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authenticated: async () => ({ user: { id: "user-1" } }),
}));
vi.mock("@/lib/teams", () => ({
  requireTeamRole: mocks.requireTeamRole,
}));
vi.mock("@/lib/supabase", () => ({ serviceDb: mocks.serviceDb }));
vi.mock("@/lib/entitlements", () => ({
  requireEntitlement: vi.fn(),
  workspaceEntitlements: vi.fn().mockResolvedValue({ limits: { audit_retention_days: 30 } }),
  auditRetentionCutoff: vi.fn().mockReturnValue("2026-07-10T00:00:00.000Z"),
  EntitlementError: class EntitlementError extends Error {},
}));

import { GET } from "./route";

describe("workspace audit route authorization", () => {
  beforeEach(() => {
    mocks.requireTeamRole.mockReset();
    mocks.serviceDb.mockReset();
    mocks.gte.mockReset();
  });

  it("allows viewers to read but not download workspace audit data", async () => {
    mocks.requireTeamRole.mockResolvedValue("viewer");
    const response = await GET(
      new Request("http://localhost/api/teams/team-1/audit?format=csv"),
      { params: Promise.resolve({ id: "team-1" }) },
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Viewer access does not include audit export.",
    });
    expect(mocks.serviceDb).not.toHaveBeenCalled();
  });

  it("enforces plan retention on every direct audit-history query", async () => {
    mocks.requireTeamRole.mockResolvedValue("owner");
    const from = vi.fn(() => {
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "gte", "order", "limit"]) {
        builder[method] = vi.fn((column?: string, value?: string) => {
          if (method === "gte") mocks.gte(column, value);
          return builder;
        });
      }
      builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
      return builder;
    });
    mocks.serviceDb.mockReturnValue({ from });

    const response = await GET(
      new Request("http://localhost/api/teams/team-1/audit"),
      { params: Promise.resolve({ id: "team-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.gte).toHaveBeenCalledTimes(5);
    expect(mocks.gte).toHaveBeenCalledWith(
      "team_decision_events.created_at",
      "2026-07-10T00:00:00.000Z",
    );
    expect(await response.json()).toMatchObject({
      retention: { days: 30, retained_since: "2026-07-10T00:00:00.000Z" },
    });
  });
});
