import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { runtimeEnv } from "@/lib/runtimeEnv";

function key(): Buffer {
  const value = runtimeEnv("MONITORING_ENCRYPTION_KEY");
  if (!value) throw new Error("Outbound notification encryption is not configured.");
  return createHash("sha256").update(value, "utf8").digest();
}

export function encryptTarget(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptTarget(value: string): string {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Notification target is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function notificationTargetConfig(value: string): {
  url: string;
  signingSecret: string;
} {
  const raw = value.startsWith("v1.") ? decryptTarget(value) : value;
  try {
    const parsed = JSON.parse(raw) as { url?: unknown; signing_secret?: unknown };
    if (typeof parsed.url === "string") {
      return {
        url: parsed.url,
        signingSecret:
          typeof parsed.signing_secret === "string"
            ? parsed.signing_secret
            : "",
      };
    }
  } catch {
    // Legacy channels store the target directly rather than as an envelope.
  }
  return { url: raw, signingSecret: "" };
}

export function outboundNotificationsConfigured(): boolean {
  return Boolean(runtimeEnv("MONITORING_ENCRYPTION_KEY") && runtimeEnv("NOTIFICATION_CRON_SECRET"));
}
