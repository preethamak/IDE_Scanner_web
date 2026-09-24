import { describe, expect, it } from "vitest";
import { buildExtensionPolicyBundle } from "./extensionPolicy";

describe("enterprise extension policy bundles", () => {
  it("creates a deny-by-default version allowlist and preserves exact hashes", () => {
    const bundle = buildExtensionPolicyBundle("team-1", [
      {
        id: "decision-1",
        scan_id: "scan-1",
        extension_id: "publisher.extension",
        version: "1.2.0",
        decision: "allow",
        artifact_sha256: "A".repeat(64),
        analysis_status: "complete",
        capabilities: [{ id: "agentic" }, { id: "agent_shell" }, { id: "agent_network" }],
        policy_version: "policy-1",
        scanner_build: "build-1",
      },
      {
        id: "decision-2",
        scan_id: "scan-2",
        extension_id: "publisher.extension",
        version: "1.1.0",
        decision: "exception",
        artifact_sha256: "b".repeat(64),
        analysis_status: "complete",
      },
      {
        id: "decision-3",
        extension_id: "blocked.extension",
        version: "9.9.9",
        decision: "block",
        artifact_sha256: "c".repeat(64),
        analysis_status: "complete",
      },
    ]);

    expect(bundle.default_action).toBe("deny");
    expect(bundle.enforcement.vscode.settings["extensions.allowed"]).toEqual({
      "*": false,
      "publisher.extension": ["1.1.0", "1.2.0"],
    });
    expect(bundle.entries).toHaveLength(2);
    expect(bundle.entries[0].artifact_sha256).toBe("b".repeat(64));
    expect(bundle.entries[0].capability_contract.observed).toEqual([]);
    expect(bundle.entries[1].capability_contract.requires_explicit_review).toBe(true);
    expect(bundle.entries[1].capability_contract.observed).toContain("agentic");
    expect(bundle.summary.reviewed_or_blocked_releases).toBe(1);
    expect(bundle.policy_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      buildExtensionPolicyBundle("team-1", [
        {
          extension_id: "publisher.extension",
          version: "1.2.0",
          decision: "allow",
          artifact_sha256: "A".repeat(64),
          analysis_status: "complete",
        },
      ], "2030-01-01T00:00:00.000Z").policy_hash,
    ).toBe(
      buildExtensionPolicyBundle("team-1", [
        {
          extension_id: "publisher.extension",
          version: "1.2.0",
          decision: "allow",
          artifact_sha256: "A".repeat(64),
          analysis_status: "complete",
        },
      ], "2030-01-02T00:00:00.000Z").policy_hash,
    );
  });

  it("withholds approvals without exact identity or complete analysis", () => {
    const bundle = buildExtensionPolicyBundle("team-1", [
      {
        id: "missing-hash",
        extension_id: "publisher.nohash",
        version: "1.0.0",
        decision: "allow",
        analysis_status: "complete",
      },
      {
        id: "incomplete",
        extension_id: "publisher.incomplete",
        version: "1.0.0",
        decision: "exception",
        artifact_sha256: "d".repeat(64),
        analysis_status: "incomplete",
      },
    ]);

    expect(bundle.entries).toHaveLength(0);
    expect(bundle.enforcement.vscode.settings["extensions.allowed"]).toEqual({ "*": false });
    expect(bundle.unresolved).toHaveLength(2);
    expect(bundle.unresolved.map((item) => item.reason).join(" ")).toContain("SHA-256");
    expect(bundle.unresolved.map((item) => item.reason).join(" ")).toContain("complete analysis");
  });

  it("withholds a decision whose joined scan belongs to another exact release", () => {
    const bundle = buildExtensionPolicyBundle("team-1", [{
      id: "mismatched-scan",
      scan_id: "scan-1",
      extension_id: "publisher.expected",
      version: "1.0.0",
      decision: "allow",
      artifact_sha256: "f".repeat(64),
      analysis_status: "complete",
      artifact_identity_match: false,
    }]);

    expect(bundle.entries).toHaveLength(0);
    expect(bundle.unresolved[0].reason).toContain("same exact extension ID and version");
  });

  it("does not let an invalid duplicate hide a deployable exact release", () => {
    const bundle = buildExtensionPolicyBundle("team-1", [
      {
        id: "stale",
        extension_id: "publisher.extension",
        version: "1.0.0",
        decision: "allow",
        analysis_status: "complete",
      },
      {
        id: "complete",
        scan_id: "scan-1",
        extension_id: "publisher.extension",
        version: "1.0.0",
        decision: "allow",
        artifact_sha256: "e".repeat(64),
        analysis_status: "complete",
      },
    ]);

    expect(bundle.entries).toHaveLength(1);
    expect(bundle.entries[0].decision_id).toBe("complete");
  });
});
