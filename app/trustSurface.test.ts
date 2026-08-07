import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const security = readFileSync(
  new URL("./security/page.tsx", import.meta.url),
  "utf8",
);
const privacy = readFileSync(
  new URL("./privacy/page.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("./trust.module.css", import.meta.url),
  "utf8",
);

describe("public trust center", () => {
  it("limits security claims to current implemented boundaries", () => {
    expect(security).toContain("current web scanner and workspace");
    expect(security).toMatch(/not\s+the future native GuardRails IDE sandbox/);
    expect(security).toContain("Incomplete never means allowed");
    expect(security).toContain("Responsible disclosure");
  });

  it("maps each product path to received, retained, and controlled data", () => {
    expect(privacy).toContain("Published extensions");
    expect(privacy).toContain("Installed extensions");
    expect(privacy).toContain("Imported report bundles");
    expect(privacy).toContain("Account and team data");
    expect(privacy).toContain("What is received");
    expect(privacy).toContain("What is retained");
    expect(privacy).toContain("Your control");
  });

  it("uses the shared light, responsive trust surface", () => {
    expect(styles).toContain("#dce9ff");
    expect(styles).toContain("#ffe5ef");
    expect(styles).toContain("#efffcf");
    expect(styles).toContain("prefers-reduced-motion");
  });
});
