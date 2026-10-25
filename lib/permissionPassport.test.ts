import { describe, expect, it } from "vitest";
import {
  buildPermissionPassport,
  permissionCategoryIds,
} from "@/lib/permissionPassport";

describe("permission passport", () => {
  it("always returns the six canonical capability categories", () => {
    const passport = buildPermissionPassport({
      extensionId: "publisher.extension",
      version: "2.0.0",
      latestVersion: "2.0.0",
      scan: {
        id: "scan-1",
        analysis_status: "complete",
        capabilities: {
          filesystem_read: {},
          dynamic_shell_execution: {},
          outbound_network: {},
          agentic_tooling: {},
        },
      },
    });
    expect(passport.categories.map((category) => category.id)).toEqual(
      permissionCategoryIds,
    );
    expect(
      passport.categories.find((category) => category.id === "files")?.state,
    ).toBe("observed");
    expect(
      passport.categories.find((category) => category.id === "secrets")?.state,
    ).toBe("not_observed");
  });

  it("distinguishes current, newer-release, pending, and unavailable analysis", () => {
    const base = { extensionId: "publisher.extension", version: "1.0.0" };
    expect(buildPermissionPassport(base).freshness).toBe("unavailable");
    expect(
      buildPermissionPassport({
        ...base,
        scan: { id: "1", analysis_status: "running" },
      }).freshness,
    ).toBe("pending");
    expect(
      buildPermissionPassport({
        ...base,
        latestVersion: "2.0.0",
        scan: { id: "1", analysis_status: "complete" },
      }).freshness,
    ).toBe("newer_release");
    expect(
      buildPermissionPassport({
        ...base,
        scan: { id: "1", analysis_status: "complete" },
      }).freshness,
    ).toBe("current");
  });

  it("keeps declared related extensions separate from the parent approval", () => {
    const passport = buildPermissionPassport({
      extensionId: "publisher.extension",
      version: "1.0.0",
      scan: {
        id: "scan-1",
        analysis_status: "complete",
        artifact_inventory: {
          extension_relationship_inventory: {
            entries: [
              { extension_id: "partner.reviewed", relationship: "extensionPack" },
              { extension_id: "partner.unavailable", relationship: "extensionDependencies" },
            ],
            resolution: [
              { extension_id: "partner.reviewed", relationship: "extensionPack", status: "scanned", resolved_version: "1.0.0", resolved_artifact_sha256: "a".repeat(64) },
              { extension_id: "partner.unavailable", relationship: "extensionDependencies", status: "acquisition_failed", resolved_version: null, resolved_artifact_sha256: null },
            ],
          },
        },
      },
    });
    expect(passport.relationship_summary).toEqual({
      declared: 2,
      scanned: 1,
      requires_separate_review: true,
    });
  });
});
