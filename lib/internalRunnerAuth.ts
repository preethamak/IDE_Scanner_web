import { createHash, timingSafeEqual } from "node:crypto";

export function validRunnerSecret(authorization: string | null): boolean {
  return validBearerSecret(authorization, process.env.SCAN_RUNNER_SECRET || "");
}

export function validBearerSecret(authorization: string | null, expected: string): boolean {
  const supplied = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !supplied) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(left, right);
}
