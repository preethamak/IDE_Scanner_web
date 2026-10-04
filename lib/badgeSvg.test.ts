import { describe, expect, it } from "vitest";
import { renderBadgeSvg } from "./badgeSvg";

describe("GuardRails badge SVG", () => {
  it("renders a compact accessible badge with a readable status segment", async () => {
    const response = renderBadgeSvg("Verified · 1.2.3", "#2fa96c", "Verified (1.2.3)");
    const svg = await response.text();

    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(svg).toContain('aria-labelledby="title desc"');
    expect(svg).toContain("<title id=\"title\">GuardRails: Verified (1.2.3)</title>");
    expect(svg).toContain("GUARDRAILS");
    expect(svg).toContain("Verified · 1.2.3");
  });

  it("escapes untrusted badge labels in both visible and accessible text", async () => {
    const svg = await renderBadgeSvg("<review>", "#b32232", "<review>").text();

    expect(svg).toContain("&lt;review&gt;");
    expect(svg).not.toContain("<review>");
  });
});
