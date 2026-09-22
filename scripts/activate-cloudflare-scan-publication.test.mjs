import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./activate-cloudflare-scan-publication.mjs", import.meta.url), "utf8");

describe("Cloudflare publication activation boundary", () => {
  it("requires every manifest member to carry the deep runtime contract", () => {
    expect(source).toContain("runtime_contract");
    expect(source).toContain('runtime.profile !== "deep"');
    expect(source).toContain('runtime.execution === "controlled-bubblewrap"');
    expect(source).toContain('runtime.execution === "policy-gated"');
    expect(source).toContain('runtime.runtime_policy === "capability-gated-v1"');
  });

  it("validates immutable manifest identity before the database write", () => {
    expect(source).toContain('from "./publication-manifest.mjs"');
    expect(source).toContain("validatePublicationManifest(extensions)");
  });

  it("rejects a member whose release identity was edited after validation", () => {
    expect(source).toContain('String(item.policy_version || "") !== policyVersion');
    expect(source).toContain('String(item.ruleset_version || "") !== rulesetVersion');
    expect(source).toContain('String(item.score_schema_version || "") !== scoreSchemaVersion');
  });

  it("revalidates remote D1 rows before applying the active-release flip", () => {
    expect(source).toContain('if (apply) {');
    expect(source).toContain('from app_scan_reports r');
    expect(source).toContain('join app_scan_jobs j on j.id=r.job_id');
    expect(source).toContain("cloudflare-publication-revalidation.mjs");
    expect(source).toContain("cloudflarePublicationMismatches");
    expect(source).toContain("Cloudflare activation revalidation failed");
  });

  it("flips the active release with one atomic SQLite update", () => {
    expect(source).toContain("if it fails, the previous");
    expect(source).toContain("SET active=CASE WHEN id=");
    expect(source).toContain("WHERE active=1 OR id=");
    expect(source).not.toContain("UPDATE app_scan_publication_releases SET active=0 WHERE active=1;");
    expect(source).not.toContain("SET active=1,activated_at=");
  });

  it("verifies the active release and exact member count after the D1 write", () => {
    expect(source).toContain("post-write verification");
    expect(source).toContain("count(distinct rr.scan_id) as release_report_count");
    expect(source).toContain("activeRows.length === 1");
    expect(source).toContain("Number(active.release_report_count) !== extensions.length");
    expect(source).toContain("Cloudflare activation post-write verification failed");
  });
});
