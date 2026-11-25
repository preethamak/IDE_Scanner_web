import { describe, expect, it } from "vitest";
import { analyticsPath, campaignValue, csvCell, referrerHost, sameOrigin } from "./validation";
import { blogMarkdown } from "@/lib/blogMarkdown";
describe("analytics and content boundaries", () => {
  it("checks the browser-facing origin behind OpenNext without trusting a foreign Origin", () => {
    expect(sameOrigin(new Request("http://localhost:8790/api/admin/content", { headers: { host: "127.0.0.1:8790", origin: "http://127.0.0.1:8790" } }))).toBe(true);
    expect(sameOrigin(new Request("https://abscissa.dev/api/admin/content", { headers: { host: "abscissa.dev", origin: "https://evil.example" } }))).toBe(false);
  });
  it("groups opaque paths and rejects URL-shaped or unknown routes", () => {
    expect(analyticsPath("/workspace/private-team?token=secret")).toBe("/workspace/[detail]");
    expect(analyticsPath("//evil.example")).toBe("/other");
    expect(analyticsPath("/unknown-secret")).toBe("/other");
    expect(analyticsPath("/api/auth/callback")).toBe("/excluded");
    expect(analyticsPath("/registry?q=secret")).toBe("/registry");
  });
  it("strips external credentials and rejects campaign data with personal identifiers", () => {
    expect(referrerHost("https://user:password@example.test/path")).toBe("");
    expect(referrerHost("https://example.test/path?q=private")).toBe("example.test");
    expect(campaignValue("person@example.test")).toBe("");
    expect(campaignValue("november-launch")).toBe("november-launch");
  });
  it("neutralizes spreadsheet formulas in exports", () => {
    expect(csvCell("=WEBSERVICE(\"evil\")")).toBe('"\'=WEBSERVICE(""evil"")"');
    expect(csvCell("\t+1")).toBe('"\'\t+1"');
  });
  it("renders Markdown on the server without executable HTML or unsafe links", () => {
    const html = blogMarkdown('# Title\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)\n\n![image](https://example.test/pixel)\n\n[good](https://example.test)');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('href="javascript:'); expect(html).not.toContain('<img');
    expect(html).toContain('href="https://example.test"');
  });
});
