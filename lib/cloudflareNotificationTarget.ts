import "server-only";

import { decryptTarget, encryptTarget } from "@/lib/notificationCrypto";

type Channel = Record<string, unknown>;

/**
 * New Cloudflare workspace channels retain their target only in encrypted
 * form. The legacy `target` fallback exists solely to deliver already queued
 * channels during migration; callers should re-save those channels on change.
 */
export function encryptedCloudflareTarget(target: string, signingSecret = ""): string {
  return encryptTarget(signingSecret ? JSON.stringify({ url: target, signing_secret: signingSecret }) : target);
}

export function cloudflareChannelTarget(channel: Channel): string {
  const encrypted = typeof channel.target_encrypted === "string" ? channel.target_encrypted : "";
  if (encrypted) return decryptTarget(encrypted);
  return typeof channel.target === "string" ? channel.target : "";
}

export function cloudflareQueuedTarget(target: string): string {
  return cloudflareTargetConfig(target).url;
}

export function cloudflareTargetConfig(target: string): { url: string; signingSecret: string } {
  const raw = target.startsWith("v1.") ? decryptTarget(target) : target;
  try {
    const parsed = JSON.parse(raw) as { url?: unknown; signing_secret?: unknown };
    if (typeof parsed.url === "string") return { url: parsed.url, signingSecret: typeof parsed.signing_secret === "string" ? parsed.signing_secret : "" };
  } catch { /* legacy URL */ }
  return { url: raw, signingSecret: "" };
}
