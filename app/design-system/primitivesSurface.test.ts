import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("shared GuardRails primitives", () => {
  it("provides canonical actions, badges, fields, navigation, overlays, and product states", () => {
    for (const file of ["../ui/Button.tsx", "../ui/IconButton.tsx", "../ui/Badge.tsx", "../ui/Field.tsx", "../ui/Surface.tsx", "../ui/Tabs.tsx", "../ui/Dialog.tsx", "../ui/DataTable.tsx", "../ui/StatePanel.tsx"]) {
      expect(read(file).length).toBeGreaterThan(100);
    }
  });

  it("keeps new controls on the semantic component token layer", () => {
    const css = read("../ui/system.module.css");
    expect(css).toContain("var(--ui-text)");
    expect(css).toContain("var(--ui-surface)");
    expect(css).toContain("var(--ui-focus)");
    expect(css).not.toContain("!important");
  });

  it("renders a component gallery for visual review", () => {
    const page = read("./page.tsx");
    const showcase = read("./DesignSystemShowcase.tsx");
    expect(page).toContain("GuardRails interface system.");
    expect(showcase).toContain("No releases need review");
    expect(showcase).toContain("Security decisions");
  });
});
