import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const summary = readFileSync(new URL("../app/PublicSecuritySummary.tsx", import.meta.url), "utf8");

describe("public security summary auth boundary", () => {
  it("uses a document navigation for an authenticated full-analysis report", () => {
    expect(summary).toContain('action.requiresSignIn ? <Link className="button buttonDark"');
    expect(summary).toContain(': <a className="button buttonDark" href={action.href}>');
  });
});
