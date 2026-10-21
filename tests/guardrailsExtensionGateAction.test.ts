import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const action = readFileSync(resolve(process.cwd(), ".github/actions/guardrails-extension-gate/action.yml"), "utf8");

describe("GuardRails extension gate action", () => {
  it("declares strict release inputs and machine-readable outputs", () => {
    expect(action).toContain("extension:");
    expect(action).toContain("version:");
    expect(action).toContain("fail-on:");
    expect(action).toContain("verdict:");
    expect(action).toContain("report-url:");
    expect(action).toContain("http-status:");
  });

  it("uses encoded exact-release requests and never treats an unknown response as approval", () => {
    expect(action).toContain('--data-urlencode "extension=$GUARDRAILS_EXTENSION"');
    expect(action).toContain('--data-urlencode "version=$GUARDRAILS_VERSION"');
    expect(action).toContain('if [[ "$http_status" == "200" && "$verdict" == "pass" ]]');
    expect(action).toContain("No release approval was inferred.");
  });

  it("publishes a release-specific job summary without emitting a credential", () => {
    expect(action).toContain("GITHUB_STEP_SUMMARY");
    expect(action).toContain("Open the exact release report");
    expect(action).not.toContain("Authorization:");
  });
});
