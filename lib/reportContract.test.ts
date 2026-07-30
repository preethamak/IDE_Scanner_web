import { describe, expect, it } from "vitest";
import { parseExtensionDossierData, ReportContractError } from "@/lib/reportContract";

function fixture() {
  return {
    id: "publisher.extension",
    version: "1.2.3",
    extension: { id: "publisher.extension", display_name: "Extension" },
    versions: [{ version: "1.2.3" }],
    scan: {
      id: "scan-1",
      extension_id: "publisher.extension",
      version: "1.2.3",
      artifact_sha256: "a".repeat(64),
      analysis_status: "complete",
      decision: "allow",
      public_outcome: "clear",
    },
    findings: [],
    files: [],
    dependencies: [],
  };
}

describe("parseExtensionDossierData", () => {
  it("normalizes a complete public report without inferring artifact identity", () => {
    const report = parseExtensionDossierData(fixture());
    expect(report.scan.artifact_sha256).toBe("a".repeat(64));
    expect(report.extension.publisher).toBe("Not reported");
  });

  it("allows incomplete analysis while retaining exact artifact identity", () => {
    const value = fixture();
    value.scan.analysis_status = "incomplete";
    value.scan.decision = "incomplete";
    value.scan.public_outcome = "incomplete";
    expect(parseExtensionDossierData(value).scan.analysis_status).toBe("incomplete");
  });

  it("rejects reports without a usable SHA-256", () => {
    const value = fixture();
    value.scan.artifact_sha256 = "not-a-digest";
    expect(() => parseExtensionDossierData(value)).toThrow(ReportContractError);
  });

  it("rejects route and scan identity mismatches", () => {
    const value = fixture();
    value.scan.extension_id = "another.extension";
    expect(() => parseExtensionDossierData(value)).toThrow("does not match the route");
  });

  it("rejects unsupported public outcomes", () => {
    const value = fixture();
    value.scan.public_outcome = "likely_malware";
    expect(() => parseExtensionDossierData(value)).toThrow("unsupported");
  });
});
