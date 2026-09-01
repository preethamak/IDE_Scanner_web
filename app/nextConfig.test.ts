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

  it("keeps eval disabled in production", () => {
    const policy = contentSecurityPolicy("production");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("https://va.vercel-scripts.com");
    expect(policy).toContain("https://*.vercel-insights.com");
  });
});
