import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const summary = readFileSync(
  new URL("../app/PublicSecuritySummary.tsx", import.meta.url),
  "utf8",
);

describe("public security summary auth boundary", () => {
  it("uses a document navigation for an authenticated full-analysis report", () => {
    expect(summary).toContain("action.requiresSignIn ? (");
    expect(summary).toContain(
      '<Link className="button buttonDark" href={action.href}>',
    );
    expect(summary).toContain(
      '<a className="button buttonDark" href={action.href}>',
    );
  });

  it("uses the canonical Deep Scan control for an unscanned exact version", () => {
    expect(summary).toContain("<DeepScanButton");
    expect(summary).toContain("extensionId={extension.id}");
    expect(summary).toContain("version={version}");
  });
});
