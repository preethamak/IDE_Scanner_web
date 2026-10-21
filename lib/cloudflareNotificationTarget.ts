import "server-only";

import { decryptTarget, encryptTarget } from "@/lib/notificationCrypto";

type Channel = Record<string, unknown>;

/**
 * New Cloudflare workspace channels retain their target only in encrypted
 * form. The legacy `target` fallback exists solely to deliver already queued
 * channels during migration; callers should re-save those channels on change.
 */
export function encryptedCloudflareTarget(target: string): string {
  return encryptTarget(target);
}

export function cloudflareChannelTarget(channel: Channel): string {
  const encrypted = typeof channel.target_encrypted === "string" ? channel.target_encrypted : "";
  if (encrypted) return decryptTarget(encrypted);
  return typeof channel.target === "string" ? channel.target : "";
}

export function cloudflareQueuedTarget(target: string): string {
  if (!target.startsWith("v1.")) return target;
  return decryptTarget(target);
}
