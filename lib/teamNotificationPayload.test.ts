import { describe, expect, it } from "vitest";
import { genericWebhookMessage, isSafeWebhookUrl } from "@/lib/teamNotificationPayload";

describe("team webhook payload", () => {
  it("uses a versioned artifact URL without exposing team metadata", () => {
    expect(genericWebhookMessage({ id: "alert", kind: "review_required", extension_id: "GitHub.copilot", version: "1.388.0", title: "Review", summary: "Evidence changed" })).toMatchObject({ event: "guardrails.monitoring_alert", artifact: { extension_id: "GitHub.copilot", version: "1.388.0", report_url: expect.stringContaining("/extensions/GitHub.copilot/versions/1.388.0") } });
  });
  it("rejects local and credential-bearing webhook targets", () => {
    expect(isSafeWebhookUrl("https://hooks.example.com/guardrails")).toBe(true);
    expect(isSafeWebhookUrl("http://hooks.example.com/guardrails")).toBe(false);
    expect(isSafeWebhookUrl("https://127.0.0.1/hook")).toBe(false);
    expect(isSafeWebhookUrl("https://user:pass@hooks.example.com/hook")).toBe(false);
  });
});
