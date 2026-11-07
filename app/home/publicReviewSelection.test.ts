import { describe, expect, it, vi } from "vitest";
import type { PublicInventoryItem } from "@/lib/productData";

vi.mock("@/lib/productData", () => ({ getPublicInventory: vi.fn() }));
import { publicReviewHref, selectPublicReview } from "./AuthorityLanding";

const artifact = (patch: Partial<PublicInventoryItem> = {}): PublicInventoryItem => ({
  scan_id: "scan-exact", extension_id: "publisher.extension", version: "1.2.3",
  artifact_sha256: "a".repeat(64), decision: "allow", coverage_percent: 100,
  display_name: "A real release", ...patch,
} as PublicInventoryItem);

describe("homepage public artifact selection", () => {
  it("never replaces missing or unaddressable evidence with an example result", () => {
    expect(selectPublicReview([])).toBeNull();
    expect(selectPublicReview([
      artifact({ scan_id: "" }), artifact({ artifact_sha256: "truncated…" }),
      artifact({ version: " latest " }), artifact({ version: "unknown" }),
      artifact({ decision: "incomplete" }), artifact({ coverage_percent: NaN }),
    ])).toBeNull();
  });

  it("selects a valid ordinary package when present without hiding policy flags otherwise", () => {
    const flagged = artifact({ decision: "block", scan_id: "flagged-scan" });
    const eslint = artifact({ extension_id: "dbaeumer.vscode-eslint", scan_id: "eslint-scan" });
    expect(selectPublicReview([flagged, eslint])).toBe(eslint);
    expect(selectPublicReview([flagged])).toBe(flagged);
  });

  it("keeps the exact version and scan identity in an escaped evidence link", () => {
    const item = artifact({ version: "1.2.3+build", scan_id: "scan/with space" });
    expect(publicReviewHref(item)).toBe("/extensions/publisher.extension/versions/1.2.3%2Bbuild/scans/scan%2Fwith%20space");
    expect(publicReviewHref(item)).not.toBe("/extensions/publisher.extension");
  });
});
