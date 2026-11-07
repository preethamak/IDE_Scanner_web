import { describe, expect, it } from "vitest";
import { signedWebhookHeaders } from "./webhookSignature";

describe("signed webhook headers", () => {
  it("binds the versioned signature to the exact timestamp and body", async () => {
    const headers = await signedWebhookHeaders("1234567890123456", "guardrails.test", '{"event":"guardrails.test"}', "1700000000");
    expect(headers).toEqual({ "X-GuardRails-Event": "guardrails.test", "X-GuardRails-Timestamp": "1700000000", "X-GuardRails-Signature": "v1=f16014376a41ac68a7e8e4c7261c06002650d1b1ef55003c0b589ca488705e41" });
  });
});
