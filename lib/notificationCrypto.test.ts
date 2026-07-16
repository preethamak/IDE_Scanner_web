import { afterEach, describe, expect, it } from "vitest";
import { decryptTarget, encryptTarget, outboundNotificationsConfigured } from "./notificationCrypto";

const previousKey = process.env.MONITORING_ENCRYPTION_KEY;
const previousCron = process.env.NOTIFICATION_CRON_SECRET;

afterEach(() => {
  if (previousKey === undefined) delete process.env.MONITORING_ENCRYPTION_KEY; else process.env.MONITORING_ENCRYPTION_KEY = previousKey;
  if (previousCron === undefined) delete process.env.NOTIFICATION_CRON_SECRET; else process.env.NOTIFICATION_CRON_SECRET = previousCron;
});

describe("notification target encryption", () => {
  it("round-trips without storing the webhook in plaintext", () => {
    process.env.MONITORING_ENCRYPTION_KEY = "test-key-that-is-never-used-in-production";
    const target = "https://hooks.slack.com/services/T000/B000/secret";
    const encrypted = encryptTarget(target);
    expect(encrypted).not.toContain("hooks.slack.com");
    expect(decryptTarget(encrypted)).toBe(target);
  });

  it("rejects a modified ciphertext", () => {
    process.env.MONITORING_ENCRYPTION_KEY = "test-key-that-is-never-used-in-production";
    const encrypted = encryptTarget("https://hooks.slack.com/services/T000/B000/secret");
    const parts = encrypted.split(".");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    expect(() => decryptTarget(parts.join("."))).toThrow();
  });

  it("requires both delivery secrets before advertising outbound delivery", () => {
    process.env.MONITORING_ENCRYPTION_KEY = "configured";
    delete process.env.NOTIFICATION_CRON_SECRET;
    expect(outboundNotificationsConfigured()).toBe(false);
    process.env.NOTIFICATION_CRON_SECRET = "configured";
    expect(outboundNotificationsConfigured()).toBe(true);
  });
});
