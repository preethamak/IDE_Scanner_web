import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync(
  path.join(process.cwd(), "app/cli/page.tsx"),
  "utf8",
);
const css = fs.readFileSync(
  path.join(process.cwd(), "app/cli/cli.css"),
  "utf8",
);

describe("GuardRails CLI product surface", () => {
  it("leads with the local editor audit outcome and explicit boundary", () => {
    expect(page).toContain("Audit every VS Code-based editor on your machine.");
    expect(page).toContain("Local inventory");
    expect(page).toContain("Exact snapshot");
    expect(page).toContain("Zero execution");
    expect(page).toContain("Private by default");
  });

  it("uses a light atmospheric product treatment", () => {
    expect(css).toContain("/* Light product experience */");
    expect(css).toContain(".cliTerminalBody");
    // One accent hue: no blue, pink, or violet palette layers may return.
    for (const hex of ["#2f6fdd", "#dce9ff", "#f8ddec", "#7658d8", "#e4d8ff"])
      expect(css.toLowerCase()).not.toContain(hex);
  });
});
