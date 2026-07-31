import { describe, expect, it } from "vitest";
import { emailPayload, isNotificationEmail } from "@/lib/emailNotification";
describe("email notification payload", () => {
  it("accepts a bounded email target and creates an evidence link", () => {
    expect(isNotificationEmail("security@example.com")).toBe(true); expect(isNotificationEmail("not-an-email")).toBe(false);
    expect(emailPayload({ title: "Review", summary: "Evidence changed", extension_id: "GitHub.copilot", version: "1.388.0" }, "security@example.com")).toMatchObject({ to: ["security@example.com"], text: expect.stringContaining("GitHub.copilot/versions/1.388.0") });
  });
});
