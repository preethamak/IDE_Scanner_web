import { describe, expect, it } from "vitest";
import { withReportUrl } from "@/lib/deepScan";

describe("withReportUrl", () => {
  it("links terminal results to the immutable scan", () => {
    expect(withReportUrl({
      status: "complete",
      extension_id: "Anthropic.claude-code",
      version: "2.1.218",
      scan_id: "scan-1",
    }).report_url).toBe("/extensions/Anthropic.claude-code/versions/2.1.218/scans/scan-1");
  });

  it("does not expose a report link before a terminal result exists", () => {
    expect(withReportUrl({
      status: "running",
      extension_id: "Anthropic.claude-code",
      version: "2.1.218",
    }).report_url).toBeUndefined();
  });
});
