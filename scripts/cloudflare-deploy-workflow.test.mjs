import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(new URL("../.github/workflows/cloudflare-deploy.yml", import.meta.url), "utf8");
const codeWorkflow = readFileSync(new URL("../.github/workflows/cloudflare-code-deploy.yml", import.meta.url), "utf8");

describe("Cloudflare production deployment boundary", () => {
  it("fails closed when the production token is missing instead of skipping deployment", () => {
    expect(workflow).toContain("CLOUDFLARE_API_TOKEN is required for a production deployment.");
    expect(workflow).toContain("exit 1");
    expect(workflow).not.toContain("configured=false");
    expect(workflow).not.toContain("steps.credentials.outputs.configured");
  });

  it("uses the repository-pinned Node runtime", () => {
    expect(workflow).toContain("node-version-file: .nvmrc");
  });

  it.each([workflow, codeWorkflow])("requires health credentials before production side effects", (source) => {
    expect(source).toContain("LAUNCH_HEALTH_SECRET is required before a production deployment.");
    expect(source.indexOf("LAUNCH_HEALTH_SECRET is required before a production deployment.")).toBeLessThan(source.indexOf("npx wrangler deploy"));
    expect(source).toContain("Deployment completed but production verification failed");
  });

  it("verifies public routes after the Worker deploys", () => {
    expect(workflow).toContain("Verify production routes");
    expect(workflow).toContain("node scripts/verify-production-deployment.mjs");
  });
});
