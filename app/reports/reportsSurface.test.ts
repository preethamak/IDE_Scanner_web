import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const css = readFileSync(
  new URL("./reports.module.css", import.meta.url),
  "utf8",
);
const chrome = readFileSync(
  new URL("../companyChrome.module.css", import.meta.url),
  "utf8",
);
const dashboard = readFileSync(
  new URL("./[id]/page.tsx", import.meta.url),
  "utf8",
);
const posture = readFileSync(
  new URL("./[id]/posture/page.tsx", import.meta.url),
  "utf8",
);
const detail = readFileSync(
  new URL("./[id]/extensions/[extensionId]/page.tsx", import.meta.url),
  "utf8",
);

describe("reports product surface", () => {
  it("leads with portable evidence and represents local storage honestly", () => {
    expect(page).toContain("Keep the decision portable");
    expect(page).toContain("without uploading them");
    expect(page).toContain("Stored in this browser");
    expect(page).toContain("Import a report");
  });

  it("supports loading, empty, populated, and confirmed-delete states", () => {
    expect(page).toContain("Opening your local report library");
    expect(page).toContain("No reports saved on this device");
    expect(page).toContain("pendingDelete === report.id");
    expect(page).toContain('role="alertdialog"');
  });

  it("uses a light responsive surface with reduced-motion behavior", () => {
    expect(css).toContain("#f7ebe6");
    expect(css).toContain("#fff6f2");
    expect(css).toContain("#fff6f2");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("keeps shared labels visible on light surfaces", () => {
    expect(chrome).toContain("background: var(--brand-soft");
    expect(chrome).toContain("color: var(--acid-dark");
    expect(chrome).not.toContain("#2a342f");
    expect(css).not.toContain("#2e3b0e");
  });

  it("does not present hydrated report state as missing while it loads", () => {
    for (const route of [dashboard, posture, detail]) {
      expect(route).toContain("const [ready, setReady] = useState(false)");
      expect(route).toContain("Opening report…");
      expect(route).toContain('aria-busy="true"');
    }
  });
});
