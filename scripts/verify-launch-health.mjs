export async function verifyLaunchHealth(baseUrl, secret) {
  if (!baseUrl || !secret) throw new Error("LAUNCH_HEALTH_URL and LAUNCH_HEALTH_SECRET are required to verify production readiness.");
  const headers = { "x-guardrails-health-token": secret };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/launch-health`, { headers, signal: AbortSignal.timeout(30_000), redirect: "error" });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.healthy !== true || !Array.isArray(body.reasons) || body.reasons.length) throw new Error(`Production health failed (${response.status}): ${JSON.stringify(body)}`);
  console.log("Verified protected production health: publication, runner, scan and notification status.");
}
