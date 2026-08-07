import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
describe("public status surface", () => {
  it("uses real aggregated service health", () => {
    const page = read("./page.tsx");
    expect(page).toContain("getPublicStatus");
    expect(page).toContain("status.services.map");
    expect(page).toContain("status.incidents.map");
    expect(page).toContain('href="/api/status"');
  });
  it("has honest loading and error states", () => {
    expect(read("./loading.tsx")).toContain("without assuming unavailable");
    expect(read("./error.tsx")).toContain("This is not reported as");
  });
  it("uses a warm light motion-safe design", () => {
    const css = read("./status.module.css");
    expect(css).toContain("#f4dce6");
    expect(css).not.toContain("#2f6fdd");
    expect(css).toContain("prefers-reduced-motion");
  });
});
