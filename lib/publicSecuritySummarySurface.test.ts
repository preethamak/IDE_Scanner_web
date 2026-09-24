import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const summary = readFileSync(
  new URL("../app/PublicSecuritySummary.tsx", import.meta.url),
  "utf8",
);
const callout = readFileSync(
  new URL("../app/PublicAnalysisCallout.tsx", import.meta.url),
  "utf8",
);

describe("public security summary auth boundary", () => {
  it("resolves the session in the browser before choosing the full-analysis action", () => {
    expect(summary).toContain("<PublicAnalysisCallout");
    expect(callout).toContain('fetch("/api/auth/session", { cache: "no-store" })');
    expect(callout).toContain('sessionState === "checking"');
    expect(callout).toContain("Checking sign-in…");
    expect(callout).toContain("publicAnalysisAction");
  });

  it("resolves the cached summary CTA against the current browser session", () => {
    expect(summary).toContain("<PublicAnalysisCallout");
    expect(callout).toContain(
      'fetch("/api/auth/session", { cache: "no-store" })',
    );
    expect(callout).toContain("publicAnalysisAction");
    expect(callout).toContain(
      '<Link className="button buttonDark" href={action.href}>',
    );
    expect(callout).toContain(
      '<a className="button buttonDark" href={action.href}>',
    );
  });

  it("uses the canonical Deep Scan control for an unscanned exact version", () => {
    expect(callout).toContain("<DeepScanButton");
    expect(callout).toContain("extensionId={extensionId}");
    expect(callout).toContain("version={version}");
  });
});
