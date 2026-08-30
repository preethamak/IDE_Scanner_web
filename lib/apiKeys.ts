import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "grk_live_";
const PREFIX_DISPLAY_LENGTH = 12;

/** Raw secret shown to the caller exactly once; only its SHA-256 hash is ever persisted. */
export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = KEY_PREFIX + randomBytes(24).toString("base64url");
  return { raw, prefix: raw.slice(0, PREFIX_DISPLAY_LENGTH), hash: hashApiKey(raw) };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length > KEY_PREFIX.length + 16;
}
