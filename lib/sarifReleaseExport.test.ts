import { describe, expect, it } from "vitest";
import { publicReleaseSarif } from "@/lib/sarifReleaseExport";

describe("publicReleaseSarif", () => {
  it("maps public findings to SARIF without exposing raw evidence", () => {
    const sarif = publicReleaseSarif({
      extensionId: "publisher.extension",
      version: "1.2.3",
      reportUrl: "https://abscissa.dev/extensions/publisher.extension/versions/1.2.3/scans/scan-1",
      scan: { id: "scan-1", analysis_status: "complete", artifact_sha256: "A".repeat(64), coverage_percent: 92 },
      findings: [{ rule_id: "network.fetch", severity: "HIGH", summary: "Unexpected network request", recommendation: "Review endpoint", confidence: 0.9, file_refs: ["dist/extension.js"], raw_evidence: "never export" }],
    });

    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].results[0]).toMatchObject({ ruleId: "network.fetch", level: "error", locations: [{ physicalLocation: { artifactLocation: { uri: "vsix://publisher.extension/1.2.3/dist/extension.js" } } }] });
    expect(JSON.stringify(sarif)).not.toContain("never export");
    expect(sarif.runs[0].properties.artifact_sha256).toBe("a".repeat(64));
  });

  it("does not publish unsafe artifact paths", () => {
    const sarif = publicReleaseSarif({ extensionId: "publisher.extension", version: "1.2.3", reportUrl: "https://example.test/report", scan: {}, findings: [{ rule_id: "rule", severity: "low", file_refs: ["../../secret", "/absolute/path"] }] });
    expect(sarif.runs[0].results[0]).not.toHaveProperty("locations");
  });
});
