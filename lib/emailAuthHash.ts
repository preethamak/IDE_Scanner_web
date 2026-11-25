import "server-only";
import { createHash } from "node:crypto";
import { runtimeEnv } from "@/lib/runtimeEnv";

export function codeHash(email: string, code: string): string {
  const secret = runtimeEnv("MONITORING_ENCRYPTION_KEY") || runtimeEnv("SCAN_RATE_LIMIT_SECRET") || "guardrails-email-auth";
  return createHash("sha256").update(`${secret}:${email}:${code}`).digest("hex");
}
