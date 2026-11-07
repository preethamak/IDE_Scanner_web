import { describe, expect, it } from "vitest";
import { assertExactWatchBaseline, exactReleaseReportHref, monitorWorkspaceHref, monitoringStatus, readExactReleaseIntent } from "./releaseReviewIntent";

const release = { extensionId: "dbaeumer.vscode-eslint", version: "3.0.10", scanId: "12345678-1234-1234-1234-123456789abc" };

describe("exact release activation", () => {
  it("survives the account next redirect without resolving the latest version", () => {
    const href = monitorWorkspaceHref(release);
    const account = `/account?next=${encodeURIComponent(href)}`;
    const next = new URL(account, "https://abscissa.dev").searchParams.get("next")!;
    expect(readExactReleaseIntent(new URL(next, "https://abscissa.dev").search)).toEqual(release);
    expect(exactReleaseReportHref(release)).toContain(`/versions/3.0.10/scans/${release.scanId}`);
  });
  it("rejects partial identity instead of silently selecting latest", () => {
    expect(readExactReleaseIntent("?extension=dbaeumer.vscode-eslint&version=3.0.10")).toBeNull();
    expect(readExactReleaseIntent("?extension=dbaeumer.vscode-eslint&scanId=invalid&version=3.0.10")).toBeNull();
  });
  it("only confirms the baseline that the user selected", () => {
    expect(() => assertExactWatchBaseline({ baseline_version: "3.0.34", baseline_scan_id: release.scanId }, release)).toThrow("exact scan");
    expect(() => assertExactWatchBaseline({ baseline_version: release.version, baseline_scan_id: "another-scan" }, release)).toThrow("exact scan");
    expect(() => assertExactWatchBaseline({ baseline_version: release.version }, release)).toThrow("exact scan");
    expect(() => assertExactWatchBaseline({ baseline_version: release.version, baseline_scan_id: release.scanId }, release)).not.toThrow();
  });
  it("reports operational state without inventing a health percentage", () => {
    expect(monitoringStatus({ status: "healthy" }, 0)).toBe("Not configured");
    expect(monitoringStatus({ status: "unknown" }, 1)).toBe("Awaiting check");
    expect(monitoringStatus({ status: "degraded" }, 1)).toBe("Needs attention");
    expect(monitoringStatus({ status: "healthy" }, 1)).toBe("Current");
  });
});
