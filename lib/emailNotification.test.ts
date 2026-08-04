import { describe, expect, it } from "vitest";
import { emailPayload, isNotificationEmail } from "@/lib/emailNotification";
describe("email notification payload", () => {
  it("accepts a bounded email target and creates an evidence link", () => {
    expect(isNotificationEmail("security@example.com")).toBe(true); expect(isNotificationEmail("not-an-email")).toBe(false);
    expect(emailPayload({ title: "Review", summary: "Evidence changed", extension_id: "GitHub.copilot", version: "1.388.0" }, "security@example.com")).toMatchObject({ to: ["security@example.com"], text: expect.stringContaining("GitHub.copilot/versions/1.388.0") });
  });

  it("uses release-specific language and baseline context for monitored releases", () => {
    const payload = emailPayload({ extension_id: "GitHub.copilot", version: "1.389.0", metadata: { release_event: true, baseline_version: "1.388.0", release_state: "analysis_incomplete" } }, "security@example.com");
    expect(payload.subject).toContain("Release change");
    expect(payload.text).toContain("GitHub.copilot@1.388.0");
    expect(payload.text).toContain("not approved");
  });
});
