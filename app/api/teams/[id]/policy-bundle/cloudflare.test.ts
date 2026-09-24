import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  role: vi.fn(),
  privateDb: vi.fn(),
  workspace: vi.fn(),
  prepare: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ authenticated: mocks.authenticated }));
vi.mock("@/lib/teams", () => ({ requireTeamRole: mocks.role }));
vi.mock("@/lib/cloudflarePrivate", () => ({ privateDb: mocks.privateDb }));
vi.mock("@/lib/cloudflareWorkspace", () => ({ getWorkspaceState: mocks.workspace }));
vi.mock("@/lib/supabase", () => ({ serviceDb: vi.fn() }));

import { GET } from "./route";

describe("Cloudflare enterprise policy export", () => {
  beforeEach(() => {
    mocks.authenticated.mockReset().mockResolvedValue({ user: { id: "owner-1" }, provider: "cloudflare" });
    mocks.role.mockReset().mockResolvedValue("owner");
    mocks.workspace.mockReset().mockResolvedValue({
      decisions: [
        { id: "decision-1", scan_id: "scan-1", extension_id: "publisher.one", version: "1.0.0", decision: "allow" },
        { id: "decision-2", scan_id: "scan-2", extension_id: "publisher.two", version: "2.0.0", decision: "exception" },
      ],
    });
    mocks.prepare.mockReset().mockReturnValue({
      bind: (...values: string[]) => {
        expect(values).toEqual(["scan-1", "scan-2"]);
        return { all: () => Promise.resolve({ results: [
          {
            scan_id: "scan-1",
            extension_id: "publisher.one",
            version: "1.0.0",
            artifact_sha256: "a".repeat(64),
            report_json: JSON.stringify({ metadata: { scanner_build: "build-1", policy_version: "policy-1" }, extensions: [
              { extension_id: "wrong.extension", version: "9.9.9", analysis_status: "incomplete", analysis_coverage: { coverage_percent: 0 }, risk_score: 99, malware_score: 0, public_outcome: "incomplete", capabilities: [] },
              { extension_id: "publisher.one", version: "1.0.0", analysis_status: "complete", analysis_coverage: { coverage_percent: 100 }, risk_score: 10, malware_score: 0, public_outcome: "clear", capabilities: [] },
            ] }),
          },
          {
            scan_id: "scan-2",
            extension_id: "publisher.two",
            version: "2.0.0",
            artifact_sha256: "b".repeat(64),
            report_json: JSON.stringify({ metadata: { scanner_build: "build-1", policy_version: "policy-1" }, extensions: [{ extension_id: "publisher.two", version: "2.0.0", analysis_status: "complete", analysis_coverage: { coverage_percent: 100 }, risk_score: 20, malware_score: 0, public_outcome: "clear", capabilities: [] }] }),
          },
        ] }) };
      },
    });
    mocks.privateDb.mockReturnValue({ prepare: mocks.prepare });
  });

  it("loads scan reports in one bounded batch instead of one query per decision", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "team-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.prepare).toHaveBeenCalledTimes(1);
    expect(mocks.prepare.mock.calls[0][0]).toContain("scan_id IN (?,?)");
    expect(body.entries).toHaveLength(2);
    expect(body.entries.map((entry: { extension_id: string }) => entry.extension_id)).toEqual([
      "publisher.one",
      "publisher.two",
    ]);
  });
});
