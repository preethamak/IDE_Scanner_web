import { createHash } from "node:crypto";
import { getExtensionProduct, seedExtensionFromRegistry } from "@/lib/productData";
import { serviceDb } from "@/lib/supabase";

export async function queueDeepScan(extensionId: string, requestedVersion: string | undefined, request: Request): Promise<Record<string, unknown>> {
  const db = serviceDb();
  let product = await getExtensionProduct(extensionId);
  if (!product) {
    await seedExtensionFromRegistry(extensionId);
    product = await getExtensionProduct(extensionId);
  }
  if (!product) throw new Error(`Extension ${extensionId} could not be resolved.`);
  const version = requestedVersion || String(product.versions.find((item) => item.is_latest)?.version || product.versions[0]?.version || product.extension.latest_version || "");
  if (!version) throw new Error("No published version is available for this extension.");

  const active = await db.from("scan_jobs").select("id,status,created_at").eq("extension_id", extensionId).eq("version", version).eq("profile", "deep").in("status", ["queued", "running"]).maybeSingle();
  if (active.data) return { ...active.data, extension_id: extensionId, version, profile: "deep", deduplicated: true };

  const requesterHash = hashRequester(request);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: requesterCount }, { count: activeCount }] = await Promise.all([
    db.from("scan_jobs").select("id", { count: "exact", head: true }).eq("requester_hash", requesterHash).gte("created_at", since),
    db.from("scan_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "running"]),
  ]);
  if ((requesterCount || 0) >= 3) throw new Error("Anonymous Deep Scan limit reached. Try again after one hour.");
  if ((activeCount || 0) >= 10) throw new Error("The free Deep Scan queue is full. Try again shortly.");

  const { data: job, error } = await db.from("scan_jobs").insert({ extension_id: extensionId, version, profile: "deep", requester_hash: requesterHash }).select("*").single();
  if (error) throw error;
  await db.from("extension_versions").update({ scan_state: "queued" }).eq("extension_id", extensionId).eq("version", version);
  try {
    const dispatch = await dispatchWorkflow(String(job.id), extensionId, version);
    if (dispatch.runId) await db.from("scan_jobs").update({ github_run_id: dispatch.runId }).eq("id", job.id);
    return { ...job, github_run_id: dispatch.runId, extension_id: extensionId, version, profile: "deep" };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Workflow dispatch failed.";
    await db.from("scan_jobs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", job.id);
    await db.from("extension_versions").update({ scan_state: "failed" }).eq("extension_id", extensionId).eq("version", version);
    throw cause;
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
