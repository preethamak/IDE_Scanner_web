import { createHash, timingSafeEqual } from "node:crypto";
import { runtimeEnv } from "@/lib/runtimeEnv";

export function validRunnerSecret(authorization: string | null): boolean {
  return validBearerSecret(authorization, runtimeEnv("SCAN_RUNNER_SECRET"));
}

export function validBearerSecret(authorization: string | null, expected: string): boolean {
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1].trim() || "";
  if (!expected || !supplied) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(left, right);
}
