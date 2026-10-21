import "server-only";

import {
  decryptTarget,
  encryptTarget,
  notificationTargetConfig,
} from "@/lib/notificationCrypto";

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

/** Preserve a configured encrypted envelope when queueing a delivery. */
export function cloudflareChannelEncryptedTarget(channel: Channel): string {
  const encrypted = typeof channel.target_encrypted === "string" ? channel.target_encrypted : "";
  return encrypted || encryptedCloudflareTarget(cloudflareChannelTarget(channel));
}

export function cloudflareQueuedTarget(target: string): string {
  return cloudflareTargetConfig(target).url;
}

export function cloudflareTargetConfig(target: string): { url: string; signingSecret: string } {
  return notificationTargetConfig(target);
}
