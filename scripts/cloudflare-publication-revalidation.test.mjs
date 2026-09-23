import { describe, expect, it } from "vitest";
import { cloudflarePublicationMismatches } from "./cloudflare-publication-revalidation.mjs";

const build = "a".repeat(40);
const artifact = "d".repeat(64);
const item = {
  scan_id: "scan-1",
  extension_id: "publisher.extension",
  version: "1.0.0",
  artifact_hash: artifact,
  decision: "allow",
};

function bundle() {
  return {
    metadata: {
      schema_version: "2.3",
      profile: "deep",
      scanner_version: "engine-1",
      scanner_build: build,
      policy_version: "3.0.0",
      ruleset_version: "rules-1",
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
        registry: { sha256: "c".repeat(64), payload: { findings: [], errors: [] } },
      },
    },
    extensions: [{
      score_schema_version: "2",
      analysis_status: "complete",
      decision: "allow",
      extension_id: item.extension_id,
      version: item.version,
      artifact_identity: { extension_id: item.extension_id, version: item.version, sha256: artifact },
      analysis_coverage: {
        status: "complete",
        executable_file_coverage_percent: 100,
        required_providers_complete: true,
        providers: {
          dynamic_sandbox: {
            required: false,
            status: "not-applicable",
            execution: "policy-gated",
            policy: "capability-gated-v1",
            executed: false,
            external_syscall_trace: false,
          },
          extension_advisories: {
            required: true,
            status: "completed",
            snapshot_version: "2026-09-22.1",
            sha256: "e".repeat(64),
          },
        },
      },
    }],
  };
}

function row(overrides = {}) {
  return {
    ...item,
    artifact_sha256: artifact,
    job_status: "complete",
    scan_purpose: "public_intelligence",
    expected_scanner_build: build,
    job_extension_id: item.extension_id,
    job_version: item.version,
    report_json: JSON.stringify(bundle()),
    ...overrides,
  };
}

describe("Cloudflare publication D1 revalidation", () => {
  it("accepts the exact report and completed job bound to the manifest", () => {
    expect(cloudflarePublicationMismatches({ extensions: [item], rows: [row()], scannerBuild: build })).toEqual([]);
  });

  it("rejects a changed artifact hash", () => {
    expect(cloudflarePublicationMismatches({
      extensions: [item],
      rows: [row({ artifact_sha256: "e".repeat(64) })],
      scannerBuild: build,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("D1 artifact hash does not match the manifest"),
      expect.stringContaining("canonical report no longer matches the release manifest"),
    ]));
  });

  it("rejects a changed canonical decision", () => {
    const changed = bundle();
    changed.extensions[0].decision = "review";
    expect(cloudflarePublicationMismatches({
      extensions: [item],
      rows: [row({ report_json: JSON.stringify(changed) })],
      scannerBuild: build,
    })).toEqual(expect.arrayContaining([
      expect.stringContaining("database decision does not match the canonical report"),
      expect.stringContaining("canonical report no longer matches the release manifest"),
    ]));
  });

  it("rejects a report whose job is not complete or not public", () => {
    expect(cloudflarePublicationMismatches({
      extensions: [item],
      rows: [row({ job_status: "running", scan_purpose: "private" })],
      scannerBuild: build,
    })).toEqual([expect.stringContaining("D1 job identity or completion state is not release-eligible")]);
  });

  it("rechecks the exact runtime receipt before activation", () => {
    const changed = bundle();
    changed.metadata.intelligence_snapshot.dynamic_sandbox.external_syscall_trace = true;
    changed.extensions[0].analysis_coverage.providers.dynamic_sandbox = {
      required: true,
      status: "completed",
      execution: "controlled-bubblewrap",
      policy: "capability-gated-v1",
      executed: true,
      external_syscall_trace: true,
    };
    expect(cloudflarePublicationMismatches({
      extensions: [item],
      rows: [row({ report_json: JSON.stringify(changed) })],
      scannerBuild: build,
    })).toEqual(expect.arrayContaining([expect.stringContaining("required dynamic runtime coverage")]))
  });
});
