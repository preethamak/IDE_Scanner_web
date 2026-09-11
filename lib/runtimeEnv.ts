import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * OpenNext binds Wrangler secrets at request time. Reading only process.env
 * works in the Node dev server but can be empty inside the deployed Worker.
 * Keep the process.env fallback so unit tests and local development retain
 * their existing behaviour.
 */
export function runtimeEnv(name: string): string {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    const value = env[name];
    if (typeof value === "string" && value.trim()) return value;
  } catch {
    // The local Node runtime has no Cloudflare request context.
  }
  return typeof process.env[name] === "string" ? process.env[name] : "";
}
