import { createHash } from "node:crypto";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { serviceDb } from "@/lib/supabase";

export async function queueDeepScan(extensionId: string, requestedVersion: string | undefined, request: Request, requestedBy: string): Promise<Record<string, unknown>> {
  const db = serviceDb();
  const item = await resolveMarketplaceExtension(extensionId);
  const version = requestedVersion || item.version;
  if (!version) throw new Error("No published version is available for this extension.");

  const requesterHash = hashRequester(request); const since=new Date(Date.now()-86400000).toISOString();
  const active=await db.from("scan_jobs").select("*").eq("extension_id",extensionId).eq("version",version).eq("profile","deep").in("status",["queued","running"]).maybeSingle();if(active.data)return{...active.data,deduplicated:true};
  const complete=await db.from("scans").select("id").eq("extension_id",extensionId).eq("version",version).order("scanned_at",{ascending:false}).limit(1).maybeSingle();if(complete.data)return{status:"complete",scan_id:complete.data.id,reused:true,extension_id:extensionId,version};
  const recent=await db.from("scan_jobs").select("id",{count:"exact",head:true}).eq("requested_by",requestedBy).gte("created_at",since);if((recent.count||0)>=10)throw new Error("Daily Deep Scan limit reached.");
  await db.from("extensions").upsert({id:item.extension_id,name:item.extension_id.split(".").slice(1).join("."),display_name:item.display_name,publisher:item.publisher,description:item.short_description,registry:item.registry||"vs-marketplace",publisher_verified:item.publisher_verified,installs:item.install_count,rating:item.rating_average,icon_url:item.icon_url,updated_at:new Date().toISOString()},{onConflict:"id"});
  await db.from("extension_versions").upsert({extension_id:item.extension_id,version,registry:item.registry||"vs-marketplace",is_latest:version===item.version,scan_state:"queued"},{onConflict:"extension_id,version"});
  const { data: job, error } = await db.from("scan_jobs").insert({extension_id:extensionId,version,profile:"deep",requester_hash:requesterHash,requested_by:requestedBy,status:"queued"}).select("*").single();
  if (error) throw error;
  try {
    const dispatch = await dispatchWorkflow(String(job.id), extensionId, version);
    await db.from("scan_jobs").update({status:"running",started_at:new Date().toISOString()}).eq("id",job.id);
    return { ...job, status:"running", github_run_id: dispatch.runId, extension_id: extensionId, version, profile: "deep" };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Workflow dispatch failed.";
    await db.from("scan_jobs").update({status:"failed",error:message.slice(0,500),completed_at:new Date().toISOString()}).eq("id",job.id);await db.from("extension_versions").update({scan_state:"failed"}).eq("extension_id",extensionId).eq("version",version);
    throw new Error(message);
  }
}

async function dispatchWorkflow(jobId: string, extensionId: string, version: string): Promise<{ runId: number | null }> {
  const token = process.env.GITHUB_ACTIONS_TOKEN || "";
  const owner = process.env.GITHUB_REPO_OWNER || "preethamak";
  const repo = process.env.GITHUB_SCANNER_REPO || "IDE_Scanner";
  if (!token) throw new Error("Deep Scan is temporarily unavailable. Try again shortly.");
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
