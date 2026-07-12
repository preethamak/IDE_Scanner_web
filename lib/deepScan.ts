import { createHash } from "node:crypto";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { publicDb } from "@/lib/supabase";

export async function queueDeepScan(extensionId: string, requestedVersion: string | undefined, request: Request): Promise<Record<string, unknown>> {
  const db = publicDb(); if (!db) throw new Error("Deep Scan is temporarily unavailable.");
  const item = await resolveMarketplaceExtension(extensionId);
  const version = requestedVersion || item.version;
  if (!version) throw new Error("No published version is available for this extension.");

  const requesterHash = hashRequester(request);
  const { data: job, error } = await db.rpc("queue_deep_scan", { p_extension_id:item.extension_id,p_name:item.extension_id.split(".").slice(1).join("."),p_display_name:item.display_name,p_publisher:item.publisher,p_description:item.short_description,p_registry:item.registry||"vs-marketplace",p_version:version,p_requester_hash:requesterHash,p_icon_url:item.icon_url,p_publisher_verified:item.publisher_verified,p_installs:item.install_count,p_rating:item.rating_average });
  if (error) throw error;
  try {
    const dispatch = await dispatchWorkflow(String(job.id), extensionId, version);
    return { ...job, github_run_id: dispatch.runId, extension_id: extensionId, version, profile: "deep" };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Workflow dispatch failed.";
    throw new Error(message);
  }
}

async function dispatchWorkflow(jobId: string, extensionId: string, version: string): Promise<{ runId: number | null }> {
  const token = process.env.GITHUB_ACTIONS_TOKEN || "";
  const owner = process.env.GITHUB_REPO_OWNER || "preethamak";
  const repo = process.env.GITHUB_SCANNER_REPO || "IDE_Scanner";
  if (!token) throw new Error("The free Deep Scan runner has not been connected yet.");
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/deep-scan.yml/dispatches`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2026-03-10" },
    body: JSON.stringify({ ref: "main", inputs: { job_id: jobId, extension_id: extensionId, version, callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner-web.vercel.app"}/api/internal/scan-results` } }),
  });
  if (!response.ok) throw new Error(`GitHub Deep Scan dispatch returned ${response.status}.`);
  const payload = await response.json().catch(() => ({})) as { workflow_run_id?: number };
  return { runId: payload.workflow_run_id || null };
}

function hashRequester(request: Request): string {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(`${process.env.SCAN_RATE_LIMIT_SECRET || "ide-scanner"}:${raw}`).digest("hex");
}
