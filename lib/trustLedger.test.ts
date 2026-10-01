import { describe, expect, it } from "vitest";
import { compareCapabilitySnapshots, normalizeArtifactIdentity, recallImpact } from "./trustLedger";

describe("trust ledger", () => {
  it("normalizes an exact artifact identity and rejects weak hashes", () => {
    const identity = normalizeArtifactIdentity({
      extension_id: "Publisher.Extension",
      version: "1.2.3",
      registry: "vs-marketplace",
      artifact_sha256: "A".repeat(64),
    });
    expect(identity).toEqual({
      extension_id: "Publisher.Extension",
      version: "1.2.3",
      registry: "vs-marketplace",
      artifact_sha256: "a".repeat(64),
    });
    expect(() => normalizeArtifactIdentity({ extension_id: "Publisher.Extension", version: "1.2.3", artifact_sha256: "weak" })).toThrow("SHA-256");
  });

  it("reports capability additions, removals, and changed values", () => {
    const delta = compareCapabilitySnapshots(
      { network: true, process: { shell: false }, credentials: ["workspace"] },
      { network: true, process: { shell: true }, filesystem: { write: true } },
    );
    expect(delta.added).toEqual(["filesystem.write"]);
    expect(delta.removed).toEqual(["credentials"]);
    expect(delta.changed).toEqual([{ path: "process.shell", before: "false", after: "true" }]);
    expect(delta.material).toBe(true);
  });

  it("separates exact inventory matches from installations without hashes", () => {
    const impact = recallImpact([
      { device_id: "laptop-a", extension_id: "Publisher.Extension", version: "1.2.3", artifact_sha256: "a".repeat(64) },
      { device_id: "laptop-b", extension_id: "Publisher.Extension", version: "1.2.3" },
      { device_id: "laptop-c", extension_id: "Publisher.Extension", version: "1.2.3", artifact_sha256: "b".repeat(64) },
      { device_id: "laptop-d", extension_id: "Publisher.Extension", version: "1.2.4", artifact_sha256: "a".repeat(64) },
    ], normalizeArtifactIdentity({ extension_id: "publisher.extension", version: "1.2.3", artifact_sha256: "a".repeat(64) }));
    expect(impact).toMatchObject({ exact_matches: 1, version_only_matches: 1, affected_devices: ["laptop-a", "laptop-b"] });
  });
});
