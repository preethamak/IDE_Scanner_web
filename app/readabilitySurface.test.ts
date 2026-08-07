import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readability = readFileSync(new URL("./readability.css", import.meta.url), "utf8");
const designSystem = readFileSync(new URL("./design-system.css", import.meta.url), "utf8");
const workspace = readFileSync(new URL("./workspace/teamWorkspace.module.css", import.meta.url), "utf8");
const audit = readFileSync(new URL("../scripts/typography-audit.mjs", import.meta.url), "utf8");

describe("cross-site readability contract", () => {
  it("enforces visible focus, disabled states, and a 12px minimum", () => {
    expect(readability).toContain(":focus-visible");
    expect(readability).toContain('[aria-disabled="true"]');
    expect(audit).toContain("0 declarations below the 12px product minimum");
    expect(audit).not.toContain("legacyBudget");
  });

  it("keeps legacy accents logo-derived and the workspace navigation light", () => {
    expect(designSystem).toContain("--green: #2f6fdd");
    expect(designSystem).toContain("--acid: #c9ff45");
    expect(workspace).toContain("--nav:#ffffff");
    expect(workspace).toContain("border-right:1px solid var(--line);background:var(--nav)");
    expect(workspace).not.toContain("--nav:#17191f");
  });
});
