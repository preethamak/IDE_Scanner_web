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
    expect(page).toContain("Audit every editor on your machine.");
    expect(page).toContain("Local inventory");
    expect(page).toContain("Exact snapshot");
    expect(page).toContain("Zero execution");
    expect(page).toContain("Private by default");
  });

  it("uses a light atmospheric product treatment", () => {
    expect(css).toContain("/* Light product experience */");
    expect(css).toContain("#dce9ff");
    expect(css).toContain("#f8ddec");
    expect(css).toContain(".cliTerminalBody");
  });
});
