import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";

const page=readFileSync(new URL("./[id]/page.tsx",import.meta.url),"utf8");
const design=readFileSync(new URL("../design-system.css",import.meta.url),"utf8");

describe("extension product profile",()=>{
  it("includes a plain-language permission passport",()=>{
    expect(page).toContain("Permission passport");
    expect(page).toContain("What this release can do.");
    expect(page).toContain("applies only to version");
  });
  it("keeps passport typography at the shared readable scale",()=>{
    expect(design).toContain(".permissionPassport");
    expect(design).toContain("var(--font-sm)");
    expect(design).toContain("var(--font-base)");
  });
  it("shows version-bound review history",()=>{
    expect(page).toContain("ReleaseTimeline");
    const timeline=readFileSync(new URL("./ReleaseTimeline.tsx",import.meta.url),"utf8");
    expect(timeline).toContain("A newer release never inherits an older result.");
    expect(timeline).toContain("Result applies only to this version");
  });
});
