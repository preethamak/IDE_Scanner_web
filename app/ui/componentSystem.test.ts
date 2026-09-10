import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("canonical component system", () => {
  it("defines a semantic dark token vocabulary", () => {
    const tokens = read("../styles/tokens.css");
    for (const token of ["--ui-canvas", "--ui-surface", "--ui-text", "--ui-accent", "--ui-focus", "--ui-danger"]) expect(tokens).toContain(token);
    expect(tokens).toContain("color-scheme: dark");
  });

  it("keeps component styling in the owned UI layer", () => {
    const styles = read("./system.module.css");
    for (const component of [".control", ".iconButton", ".surface", ".pageHeader", ".field", ".tabs", ".dialog", ".table"]) expect(styles).toContain(component);
    expect(styles).toContain("prefers-reduced-motion:reduce");
    expect(styles).not.toContain("!important");
  });

  it("requires accessible names and dialog semantics", () => {
    expect(read("./IconButton.tsx")).toContain("aria-label={label}");
    const dialog = read("./Dialog.tsx");
    expect(dialog).toContain('role="dialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('event.key === "Escape"');
  });

  it("supports keyboard navigation in tabs", () => {
    const tabs = read("./Tabs.tsx");
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) expect(tabs).toContain(key);
    expect(tabs).toContain('role="tablist"');
    expect(tabs).toContain('role="tabpanel"');
  });
});
