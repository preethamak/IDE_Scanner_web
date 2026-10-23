import { describe, expect, it } from "vitest";
import { extensionRelationships, relationshipResolutionLabel } from "@/lib/extensionRelationships";

describe("extension relationship evidence", () => {
  it("keeps manifest declarations distinct from separately resolved artifacts", () => {
    const relationships = extensionRelationships({
      extension_relationship_inventory: {
        entries: [
          { extension_id: "Publisher.Pack", relationship: "extensionPack", declared_in: "extensionPack" },
          { extension_id: "publisher.dep", relationship: "extensionDependencies", declared_in: "extensionDependencies" },
        ],
        resolution: [
          { extension_id: "publisher.pack", relationship: "extensionPack", status: "scanned", resolved_version: "2.0.0", resolved_artifact_sha256: "a".repeat(64) },
          { extension_id: "publisher.dep", relationship: "extensionDependencies", status: "acquisition_failed" },
        ],
      },
    });

    expect(relationships).toEqual([
      expect.objectContaining({ extensionId: "publisher.dep", relationship: "extensionDependencies", resolution: { status: "acquisition_failed" } }),
      expect.objectContaining({ extensionId: "publisher.pack", relationship: "extensionPack", resolution: expect.objectContaining({ status: "scanned", version: "2.0.0" }) }),
    ]);
    expect(relationshipResolutionLabel("scanned")).toBe("Separately scanned");
    expect(relationshipResolutionLabel("acquisition_failed")).toBe("Acquisition failed");
  });

  it("ignores malformed and unsupported relationship input", () => {
    expect(extensionRelationships({ extension_relationship_inventory: { entries: [
      { extension_id: "publisher.ignored", relationship: "runtime" },
      { extension_id: "", relationship: "extensionPack" },
      null,
    ] } })).toEqual([]);
  });
});
