import { describe, expect, it } from "vitest";
import { getSecurityHeaders } from "../next.config";

function contentSecurityPolicy(nodeEnv: "development" | "production") {
  return getSecurityHeaders(nodeEnv).find((header) => header.key === "Content-Security-Policy")?.value || "";
}

describe("Content Security Policy", () => {
  it("allows React and development analytics to run in development only", () => {
    const policy = contentSecurityPolicy("development");
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("https://va.vercel-scripts.com");
  });

  it("permits consented GA4 loading and collection without opening arbitrary hosts", () => {
    const directives = Object.fromEntries(contentSecurityPolicy("production").split("; ").map(directive => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }));
    expect(directives["script-src"]).toContain("https://www.googletagmanager.com");
    expect(directives["connect-src"]).toContain("https://www.google-analytics.com");
    expect(directives["connect-src"]).toContain("https://region1.google-analytics.com");
    expect(directives["script-src"]).not.toContain("https:");
    expect(directives["connect-src"]).not.toContain("*");
  });

  it("keeps eval disabled in production", () => {
    const policy = contentSecurityPolicy("production");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("https://va.vercel-scripts.com");
    expect(policy).toContain("https://*.vercel-insights.com");
  });
});
