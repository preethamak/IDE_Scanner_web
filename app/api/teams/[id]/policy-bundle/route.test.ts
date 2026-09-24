import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  role: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/supabase", () => ({ serviceDb: () => ({ from: mocks.from }) }));

import { GET } from "./route";

const context = { params: Promise.resolve({ id: "team-1" }) };

describe("enterprise policy bundle API", () => {
  beforeEach(() => {
    mocks.authenticated.mockReset().mockResolvedValue({
      user: { id: "analyst-1" },
      provider: "supabase",
    });
    mocks.role.mockReset().mockResolvedValue("analyst");
    mocks.from.mockReset();
  });

  it("exports only complete exact releases and queries the deployed scan schema", async () => {
    const decisions = [{
      id: "decision-1",
      scan_id: "scan-1",
      extension_id: "publisher.extension",
      version: "1.2.3",
      decision: "allow",
      rationale: "Approved by the platform team.",
      updated_at: "2026-09-17T00:00:00.000Z",
    }];
    const scans = [{
      id: "scan-1",
      extension_id: "publisher.extension",
      version: "1.2.3",
      artifact_sha256: "a".repeat(64),
      scanner_build: "build-1",
      policy_version: "policy-1",
      score_schema_version: "2",
      analysis_status: "complete",
      coverage_percent: 100,
      risk_score: 12,
      malware_score: 0,
      public_outcome: "clear",
      capabilities: { capabilities: ["agent_shell"] },
      capability_assessment: { matched: ["agent_shell"] },
    }];
    mocks.from.mockImplementation((table: string) => {
      if (table === "team_decisions") {
        return {
          select: (columns: string) => ({
            eq: () => ({
              order: () => ({
                range: () => Promise.resolve({ data: decisions, error: null }),
              }),
            }),
            columns,
          }),
        };
      }
      return {
        select: (columns: string) => {
          expect(columns).not.toContain("trust_tier");
          return { in: () => Promise.resolve({ data: scans, error: null }) };
        },
      };
    });

    const response = await GET(new Request("http://localhost"), context);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.default_action).toBe("deny");
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0]).toMatchObject({
      extension_id: "publisher.extension",
      version: "1.2.3",
      artifact_sha256: "a".repeat(64),
    });
    expect(body.entries[0].capability_contract.requires_explicit_review).toBe(true);
  });
});
