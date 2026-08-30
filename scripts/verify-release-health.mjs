import { fileURLToPath } from "node:url";

const RUNNER_DELAY_REASON = "Deep Scan runner is runner_delayed.";

/**
 * Classify the protected release-health response for the catalog workflow.
 * A delayed GitHub runner is observable and still accepts queued requests, so
 * it should warn without making an otherwise successful catalog refresh fail.
 */
export function classifyReleaseHealth(status, body) {
  if (status >= 200 && status < 300 && body?.healthy === true) {
    return { outcome: "pass", message: "Public release health passed." };
  }

  if (
    status === 503 &&
    body?.healthy === false &&
    Array.isArray(body.reasons) &&
    body.reasons.length === 1 &&
    body.reasons[0] === RUNNER_DELAY_REASON
  ) {
    return {
      outcome: "warn",
      message: `${RUNNER_DELAY_REASON} Catalog refresh completed; queued scans remain accepted.`,
    };
  }

  return {
    outcome: "fail",
    message: `Public release health failed: ${status} ${JSON.stringify(body)}`,
  };
}

async function main() {
  const baseUrl = process.env.LAUNCH_HEALTH_URL || "https://ide-scanner.vercel.app";
  const secret = process.env.LAUNCH_HEALTH_SECRET;
  if (!secret) throw new Error("LAUNCH_HEALTH_SECRET is required.");

  const headers = { "x-guardrails-health-token": secret };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/launch-health`, { headers });
  const body = await response.json().catch(() => null);
  const result = classifyReleaseHealth(response.status, body);

  if (result.outcome === "pass") {
    console.log(result.message);
    return;
  }
  if (result.outcome === "warn") {
    console.warn(`::warning::${result.message}`);
    return;
  }
  throw new Error(result.message);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
