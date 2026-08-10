import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("production theme surface", () => {
  it("boots before hydration and exposes an accessible three-way control", () => {
    expect(read("./layout.tsx")).toContain('strategy="beforeInteractive"');
    const toggle = read("./ThemeToggle.tsx");
    for (const choice of ["Light", "Dark", "System"]) expect(toggle).toContain(choice);
    expect(toggle).toContain('role="menuitemradio"');
  });

  it("keeps Vanta theme-aware and motion-safe", () => {
    const fog = read("./components/VantaFog.tsx");
    expect(fog).toContain('import("vanta/dist/vanta.fog.min")');
    expect(fog).toContain("prefers-reduced-motion: reduce");
    expect(fog).toContain("guardrails:theme");
  });
});
