import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./[id]/page.tsx", import.meta.url), "utf8");
const passport = readFileSync(
  new URL("./PermissionPassport.tsx", import.meta.url),
  "utf8",
);
const permissionDiff = readFileSync(
  new URL("./PermissionDiffCard.tsx", import.meta.url),
  "utf8",
);
const exactVersion = readFileSync(
  new URL("../PublicSecuritySummary.tsx", import.meta.url),
  "utf8",
);
const workspace = readFileSync(
  new URL("../TeamWorkspace.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("./permissionPassport.module.css", import.meta.url),
  "utf8",
);

describe("extension product profile", () => {
  it("uses one canonical six-category Permission Passport across product surfaces", () => {
    expect(page).toContain("buildPermissionPassport");
    expect(exactVersion).toContain("PermissionPassport");
    expect(workspace).toContain("PermissionPassport");
    for (const label of [
      "Files",
      "Terminal",
      "Network",
      "Secrets",
      "Editor",
      "Agents & tools",
    ]) {
      expect(
        passport +
          readFileSync(
            new URL("../../lib/permissionPassport.ts", import.meta.url),
            "utf8",
          ),
      ).toContain(label);
    }
  });

  it("distinguishes observed, not observed, and unknown without claiming safety", () => {
    expect(passport).toContain(
      "Not observed in this scan—not a guarantee of absence.",
    );
    expect(passport).toContain("Capability describes power—not");
    expect(passport).toContain("malicious intent.");
    expect(passport).toContain("No completed analysis for this release.");
  });

  it("shows freshness and makes the exact-version passport shareable", () => {
    expect(passport).toContain("Newer release available");
    expect(passport).toContain("Copy link");
    expect(passport).toContain("Export JSON");
    expect(passport).toContain("never carries forward to another version");
  });

  it("reuses an evidence-backed Permission Diff on extension and workspace review", () => {
    expect(page).toContain("PermissionDiffCard");
    expect(workspace).toContain("PermissionDiffCard");
    expect(permissionDiff).toContain("/compare?from=");
    expect(permissionDiff).toContain(
      "What changed since the reviewed release.",
    );
    expect(permissionDiff).toContain("Same scanner baseline");
    expect(permissionDiff).toContain("Both releases need completed analysis");
  });

  it("keeps passport typography at the readable scale", () => {
    expect(css).not.toMatch(/font-size:\s*(?:[0-9]|10|11)px/);
    expect(css).toMatch(/font-size:\s*12px/);
  });

  it("shows version-bound review history", () => {
    expect(page).toContain("ReleaseTimeline");
    const timeline = readFileSync(
      new URL("./ReleaseTimeline.tsx", import.meta.url),
      "utf8",
    );
    expect(timeline).toContain(
      "A newer release never inherits an older result.",
    );
    expect(timeline).toContain("Result applies only to this version");
  });
});
