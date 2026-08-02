import { describe, expect, it } from "vitest";
import { extensionPageModel } from "@/lib/extensionPageModel";

describe("extensionPageModel", () => {
  it("keeps an unscanned release on its public version route", () => {
    expect(extensionPageModel("GitHub.copilot", "1.388.0", null)).toMatchObject({
      hasPublicReport: false,
      decision: "not-scanned",
      reportHref: "/extensions/GitHub.copilot/versions/1.388.0",
    });
  });

  it("uses the immutable report route whenever a scan exists", () => {
    expect(extensionPageModel("GitHub.copilot", "1.388.0", { id: "scan/one", decision: "review" })).toMatchObject({
      hasPublicReport: true,
      decision: "review",
      reportHref: "/extensions/GitHub.copilot/versions/1.388.0/scans/scan%2Fone",
    });
  });
});
