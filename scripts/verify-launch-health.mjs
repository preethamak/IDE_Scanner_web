const missingScan = "Scan failure rate is unavailable or invalid.";
const missingDelivery = "Notification failure rate is unavailable or invalid.";

/** Only missing traffic samples can be a warning during deploy verification. */
export function onlyMissingSamples(status, body) {
  if (status !== 503 || body?.healthy !== false || !Array.isArray(body.reasons) || body.reasons.length === 0) return false;
  const validRate = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 0.1;
  const checks = [["scan_failure_rate", missingScan], ["notification_failure_rate", missingDelivery]];
  if (!body.reasons.every((reason) => checks.some(([, expected]) => reason === expected))) return false;
  return checks.every(([field, reason]) => body[field] === null ? body.reasons.includes(reason) : validRate(body[field]) && !body.reasons.includes(reason));
}

export async function verifyLaunchHealth(baseUrl, secret, { allowMissingSamples = false } = {}) {
  if (!baseUrl || !secret) throw new Error("LAUNCH_HEALTH_URL and LAUNCH_HEALTH_SECRET are required to verify production readiness.");
  const headers = { "x-guardrails-health-token": secret };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/launch-health`, { headers, signal: AbortSignal.timeout(30_000), redirect: "error" });
  const body = await response.json().catch(() => null);
  if (allowMissingSamples && onlyMissingSamples(response.status, body)) {
    console.warn("::warning::Deployment checks completed, but recent scan or notification samples are unavailable. Launch health remains unverified.");
    return { verified: false, reason: "missing_samples" };
  }
  if (!response.ok || body?.healthy !== true || !Array.isArray(body.reasons) || body.reasons.length) throw new Error(`Production health failed (${response.status}): ${JSON.stringify(body)}`);
  console.log("Verified protected production health: publication, runner, scan and notification status.");
  return { verified: true };
}
