import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloudflareChannelTarget,
  cloudflareQueuedTarget,
  encryptedCloudflareTarget,
} from "./cloudflareNotificationTarget";

describe("Cloudflare notification target encryption", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("stores new workspace and queued targets encrypted while retaining legacy delivery compatibility", () => {
    vi.stubEnv("MONITORING_ENCRYPTION_KEY", "test-encryption-key");
    const encrypted = encryptedCloudflareTarget("https://hooks.example.com/guardrails");

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain("hooks.example.com");
    expect(cloudflareChannelTarget({ target_encrypted: encrypted })).toBe("https://hooks.example.com/guardrails");
    expect(cloudflareQueuedTarget(encrypted)).toBe("https://hooks.example.com/guardrails");
    expect(cloudflareChannelTarget({ target: "https://legacy.example.com/hook" })).toBe("https://legacy.example.com/hook");
    expect(cloudflareQueuedTarget("https://legacy.example.com/hook")).toBe("https://legacy.example.com/hook");
  });
});
