import { createHash } from "node:crypto";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { serviceDb } from "@/lib/supabase";
import { getDeepScanHealth } from "@/lib/deepScanHealth";

export async function queueDeepScan(extensionId: string, requestedVersion: string | undefined, request: Request, requestedBy: string): Promise<Record<string, unknown>> {
  const db = serviceDb();
  const health = await getDeepScanHealth();
  if (!health.available) throw new Error("Deep Scan is temporarily paused while the analysis runner reconnects.");

  const item = await resolveMarketplaceExtension(extensionId);
  const version = requestedVersion || item.version;
  if (!version) throw new Error("No published version is available for this extension.");

  const active = await db.from("scan_jobs").select("*").eq("extension_id", extensionId).eq("version", version).eq("profile", "deep").in("status", ["queued", "running"]).maybeSingle();
  if (active.error) throw active.error;
  if (active.data) return { ...active.data, deduplicated: true };

  const complete = await db.from("scans").select("id").eq("extension_id", extensionId).eq("version", version).order("scanned_at", { ascending: false }).limit(1).maybeSingle();
  if (complete.error) throw complete.error;
  if (complete.data) return { status: "complete", scan_id: complete.data.id, reused: true, extension_id: extensionId, version };

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const recent = await db.from("scan_jobs").select("id", { count: "exact", head: true }).eq("requested_by", requestedBy).gte("created_at", since);
  if (recent.error) throw recent.error;
  if ((recent.count || 0) >= 10) throw new Error("Daily Deep Scan limit reached.");

  const extension = await db.from("extensions").upsert({ id: item.extension_id, name: item.extension_id.split(".").slice(1).join("."), display_name: item.display_name, publisher: item.publisher, description: item.short_description, registry: item.registry || "vs-marketplace", publisher_verified: item.publisher_verified, installs: item.install_count, rating: item.rating_average, icon_url: item.icon_url, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (extension.error) throw extension.error;

  const artifact = await db.from("extension_versions").upsert({ extension_id: item.extension_id, version, registry: item.registry || "vs-marketplace", is_latest: version === item.version, scan_state: "queued" }, { onConflict: "extension_id,version" });
  if (artifact.error) throw artifact.error;

  const requesterHash = hashRequester(request);
  const job = await db.from("scan_jobs").insert({ extension_id: extensionId, version, profile: "deep", requester_hash: requesterHash, requested_by: requestedBy, status: "queued" }).select("*").single();
  if (job.error) {
    const concurrent = await db.from("scan_jobs").select("*").eq("extension_id", extensionId).eq("version", version).eq("profile", "deep").in("status", ["queued", "running"]).maybeSingle();
    if (concurrent.data) return { ...concurrent.data, deduplicated: true };
    await db.from("extension_versions").update({ scan_state: "failed" }).eq("extension_id", extensionId).eq("version", version);
    throw job.error;
  }
  return { ...job.data, profile: "deep", runner_poll_seconds: 300 };
}

function hashRequester(request: Request): string {
  const raw = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256").update(`${process.env.SCAN_RATE_LIMIT_SECRET || "ide-scanner"}:${raw}`).digest("hex");
}
