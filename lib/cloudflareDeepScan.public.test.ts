import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  db: null as {
    prepare: ReturnType<typeof vi.fn>;
    batch: ReturnType<typeof vi.fn>;
  } | null,
  privateDb: vi.fn(),
  runnerCompleted: vi.fn(),
  runnerError: vi.fn(),
  catalogExtension: vi.fn(),
  marketplaceExtension: vi.fn(),
  githubDispatch: vi.fn(),
  runtimeEnv: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/cloudflarePrivate", () => ({
  privateDb: harness.privateDb,
  parseCookies: vi.fn(() => ({})),
  newId: vi.fn(() => "new-id"),
  nowIso: vi.fn(() => "2026-09-19T00:00:00.000Z"),
  requestIsSecure: vi.fn(() => true),
  sessionHash: vi.fn(() => "session-hash"),
}));
vi.mock("@/lib/cloudflareRunnerStatus", () => ({
  markCloudflareRunnerClaimed: vi.fn(),
  markCloudflareRunnerCompleted: harness.runnerCompleted,
  markCloudflareRunnerError: harness.runnerError,
  recordCloudflareRunnerHeartbeat: vi.fn(),
}));
vi.mock("@/lib/runtimeEnv", () => ({ runtimeEnv: harness.runtimeEnv }));
vi.mock("@/lib/cloudflareRegistry", () => ({
  getCloudflareRegistryCatalogExtension: harness.catalogExtension,
  getCloudflareRegistryProduct: vi.fn(),
}));
vi.mock("@/lib/marketplace", () => ({ resolveMarketplaceExtension: harness.marketplaceExtension }));
vi.mock("@/lib/cloudflareGithubDispatch", () => ({ dispatchGithubDeepScan: harness.githubDispatch }));

import { claimCloudflareJob, failCloudflareScan, queueCloudflareDeepScan, saveCloudflareScanResult } from "@/lib/cloudflareDeepScan";

const build = "a".repeat(40);
const artifactSha = "d".repeat(64);

function makeDb(job: Record<string, unknown>) {
  const first = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(job);
  const statement = { bind: vi.fn(() => ({ first })) };
  const db = {
    prepare: vi.fn(() => statement),
    batch: vi.fn().mockResolvedValue(undefined),
  };
  harness.db = db;
  harness.privateDb.mockReturnValue(db);
  return db;
}

function validBundle() {
  return {
    metadata: {
      schema_version: "2.3",
      profile: "deep",
      scanner_version: "engine-1",
      scanner_build: build,
      ruleset_version: "rules-1",
      policy_version: "3.0.0",
      intelligence_snapshot: {
        dynamic_sandbox: {
          status: "executed",
          execution: "controlled-bubblewrap",
          runtime_policy: "capability-gated-v1",
          executed: true,
          external_syscall_trace: false,
          external_syscall_trace_available: true,
        },
        extension_advisories: {
          status: "completed",
          snapshot_version: "2026-09-22.1",
          sha256: "e".repeat(64),
        },
        registry: {
          sha256: "c".repeat(64),
          payload: { findings: [], errors: [] },
        },
      },
    },
    extensions: [{
      extension_id: "publisher.extension",
      version: "1.0.0",
      score_schema_version: "2",
      analysis_status: "complete",
      decision: "allow",
      artifact_identity: { extension_id: "publisher.extension", version: "1.0.0", sha256: artifactSha },
      analysis_coverage: {
        status: "complete",
        executable_file_coverage_percent: 100,
        required_providers_complete: true,
          providers: {
            dynamic_sandbox: {
            status: "not-applicable",
            execution: "policy-gated",
            executed: false,
            required: false,
            policy: "capability-gated-v1",
              external_syscall_trace: false,
            },
            extension_advisories: {
              status: "completed",
              required: true,
              snapshot_version: "2026-09-22.1",
              sha256: "e".repeat(64),
            },
          },
      },
    }],
  };
}

describe("Cloudflare canonical scan callback", () => {
  beforeEach(() => {
    harness.privateDb.mockReset();
    harness.runnerCompleted.mockReset();
    harness.runnerError.mockReset();
    harness.catalogExtension.mockReset();
    harness.marketplaceExtension.mockReset();
    harness.githubDispatch.mockReset();
    harness.runtimeEnv.mockReset();
    harness.runnerCompleted.mockResolvedValue(undefined);
    harness.runnerError.mockResolvedValue(undefined);
    harness.catalogExtension.mockResolvedValue(null);
    harness.marketplaceExtension.mockResolvedValue({ extension_id: "publisher.extension", version: "1.0.0" });
    harness.runtimeEnv.mockReturnValue("");
  });

  it("rejects a forged public result before it can enter D1", async () => {
    const db = makeDb({
      id: "job-1",
      extension_id: "publisher.extension",
      version: "1.0.0",
      profile: "deep",
      scan_purpose: "public_intelligence",
      expected_scanner_build: build,
    });
    const bundle = validBundle();
    bundle.metadata.schema_version = "2.2";

    await expect(saveCloudflareScanResult("job-1", bundle)).rejects.toThrow("report schema 2.3");
    expect(db.batch).not.toHaveBeenCalled();
  });

  it("persists a complete canonical public result after shared admission", async () => {
    const db = makeDb({
      id: "job-1",
      extension_id: "publisher.extension",
      version: "1.0.0",
      profile: "deep",
      scan_purpose: "public_intelligence",
      expected_scanner_build: build,
    });

    await expect(saveCloudflareScanResult("job-1", validBundle())).resolves.toEqual(expect.any(String));
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(harness.runnerCompleted).toHaveBeenCalledTimes(1);
  });

  it("does not let a losing concurrent worker scan the same queued job", async () => {
    const queued = {
      id: "job-1",
      extension_id: "publisher.extension",
      version: "1.0.0",
      status: "queued",
    };
    const first = vi.fn().mockResolvedValue(queued);
    const run = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
    const db = {
      prepare: vi.fn((query: string) => query.startsWith("SELECT * FROM app_scan_jobs")
        ? { bind: vi.fn(() => ({ first })) }
        : { bind: vi.fn(() => ({ run })) }),
    };
    harness.privateDb.mockReturnValue(db);

    await expect(claimCloudflareJob({
      runnerId: "runner-1",
      jobId: null,
      githubRunId: 123,
      githubSha: build,
    })).resolves.toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not let a late failure callback overwrite a completed report", async () => {
    const run = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
    const db = {
      prepare: vi.fn(() => ({ bind: vi.fn(() => ({ run })) })),
    };
    harness.privateDb.mockReturnValue(db);

    await expect(failCloudflareScan("job-1", "stale worker failure")).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
    expect(harness.runnerError).not.toHaveBeenCalled();
    expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("status IN ('queued','running')"));
  });

  it("does not mark a job failed when dispatch acknowledgement is lost", async () => {
    harness.runtimeEnv.mockImplementation((key: string) => key === "GITHUB_ACTIONS_TOKEN" ? "github-token" : "");
    harness.githubDispatch.mockRejectedValue(new Error("dispatch response timeout"));
    const statements: string[] = [];
    const db = {
      prepare: vi.fn((query: string) => {
        statements.push(query);
        return {
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(
              query.includes("COUNT(*)")
                ? { count: 0 }
                : query.includes("dispatch_count")
                  ? { dispatch_count: 0, status: "queued", updated_at: null }
                  : null,
            ),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
          })),
        };
      }),
    };
    harness.privateDb.mockReturnValue(db);

    await expect(queueCloudflareDeepScan(
      "publisher.extension",
      "1.0.0",
      new Request("https://example.test"),
      { id: "user-1" } as never,
    )).rejects.toThrow("dispatch response timeout");
    expect(statements.some((query) => query.includes("status='failed'") && query.includes("status='queued'") && query.includes("app_scan_reports"))).toBe(true);
  });

  it("reuses only a complete report bound to the active publication release", async () => {
    const db = {
      prepare: vi.fn((query: string) => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(query.includes("FROM app_scan_jobs") ? null : null),
          all: vi.fn().mockResolvedValue(query.includes("app_scan_publication_release_reports") ? {
            results: [{
              scan_id: "current-scan",
              report_json: JSON.stringify(validBundle()),
              scanner_build: build,
              ruleset_version: "rules-1",
              policy_version: "3.0.0",
              score_schema_version: "2",
            }],
          } : { results: [] }),
        })),
      })),
      batch: vi.fn(),
    };
    harness.privateDb.mockReturnValue(db);

    await expect(queueCloudflareDeepScan(
      "publisher.extension",
      "1.0.0",
      new Request("https://example.test"),
      { id: "user-1" } as never,
    )).resolves.toMatchObject({ status: "complete", scan_id: "current-scan", reused: true });
  });

  it("does not reuse a report whose scanner build is not the active release build", async () => {
    const staleBundle = validBundle();
    staleBundle.metadata.scanner_build = "b".repeat(40);
    const statements: string[] = [];
    const db = {
      prepare: vi.fn((query: string) => {
        statements.push(query);
        return {
          bind: vi.fn(() => ({
            first: vi.fn().mockResolvedValue(
              query.includes("SELECT scan_id FROM app_scan_reports") ? { scan_id: "stale-scan" }
                : query.includes("COUNT(*)") ? { count: 0 }
                  : query.includes("dispatch_count") ? { dispatch_count: 0, status: "queued", updated_at: null }
                    : null,
            ),
            all: vi.fn().mockResolvedValue(query.includes("app_scan_publication_release_reports") ? {
              results: [{ scan_id: "stale-scan", report_json: JSON.stringify(staleBundle), scanner_build: build, ruleset_version: "rules-1", policy_version: "3.0.0", score_schema_version: "2" }],
            } : { results: [] }),
            run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
          })),
        };
      }),
      batch: vi.fn(),
    };
    harness.privateDb.mockReturnValue(db);
    harness.runtimeEnv.mockImplementation((key: string) => key === "GITHUB_ACTIONS_TOKEN" ? "github-token" : "");
    harness.githubDispatch.mockResolvedValue({ ok: true, status: 204 });

    const result = await queueCloudflareDeepScan(
      "publisher.extension",
      "1.0.0",
      new Request("https://example.test"),
      { id: "user-1" } as never,
    );
    expect(result.status).toBe("queued");
    expect(result.reused).toBeUndefined();
    expect(statements.some((query) => query.includes("SELECT scan_id FROM app_scan_reports WHERE extension_id"))).toBe(false);
  });
});
