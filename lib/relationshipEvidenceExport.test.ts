import { describe, expect, it } from "vitest";
import { exportRelationshipEvidence } from "./relationshipEvidenceExport";

describe("relationship evidence export", () => {
  it("exports only normalized relationship identity and completion evidence", () => {
    const value = exportRelationshipEvidence({
      extension_relationship_inventory: {
        entries: [{ extension_id: "Partner.Child", relationship: "extension_dependency", declared_in: "extensionDependencies", internal_note: "do not export" }],
        resolution: [{ extension_id: "Partner.Child", relationship: "extension_dependency", status: "scanned", resolved_extension_id: "Partner.Child", resolved_version: "1.0.0", resolved_artifact_sha256: "a".repeat(64), error: "do not export" }],
      },
    });
    expect(value).toEqual({
      declared: [{ extension_id: "partner.child", relationship: "extension_dependency" }],
      resolution: [{ extension_id: "partner.child", relationship: "extension_dependency", status: "scanned", resolved_extension_id: "partner.child", resolved_version: "1.0.0", resolved_artifact_sha256: "a".repeat(64) }],
      requires_separate_review: false,
    });
    expect(JSON.stringify(value)).not.toContain("do not export");
  });

  it("requires separate review when a declared child is missing or incomplete", () => {
    expect(exportRelationshipEvidence({ extension_relationship_inventory: { entries: [{ extension_id: "partner.child", relationship: "extension_pack" }], resolution: [] } }).requires_separate_review).toBe(true);
  });
});
