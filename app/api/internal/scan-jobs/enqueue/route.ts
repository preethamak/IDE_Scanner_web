import { NextResponse } from "next/server";
import { validRunnerSecret } from "@/lib/internalRunnerAuth";
import { serviceDb } from "@/lib/supabase";
import { benchmarkRows } from "@/lib/websiteBenchmarkRows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestedJob = {
  extension_id?: unknown;
  version?: unknown;
  scan_purpose?: unknown;
  registry?: unknown;
};

const extensionPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/;
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,79}$/;
const allowedPurposes = new Set(["benchmark", "public_intelligence"]);

export async function POST(request: Request) {
  if (!validRunnerSecret(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized runner." }, { status: 401 });
  const payload = await request.json().catch(() => ({})) as { jobs?: RequestedJob[] };
  if (!Array.isArray(payload.jobs) || payload.jobs.length < 1 || payload.jobs.length > 50) {
    return NextResponse.json({ error: "Provide between 1 and 50 canonical scan jobs." }, { status: 400 });
  }

  const jobs = payload.jobs.map(normalizeJob);
  if (jobs.some((job) => !job)) return NextResponse.json({ error: "One or more scan jobs are invalid." }, { status: 400 });
  const normalized = jobs as Array<{ extension_id: string; version: string; scan_purpose: "benchmark" | "public_intelligence"; registry: "vs-marketplace" | "openvsx" }>;
  for (const job of normalized) {
    if (job.scan_purpose !== "benchmark") continue;
    const frozen = benchmarkRows.find((row) => row.id.toLowerCase() === job.extension_id.toLowerCase() && row.version === job.version);
    if (!frozen) return NextResponse.json({ error: `Benchmark artifact is not frozen: ${job.extension_id}@${job.version}` }, { status: 400 });
  }

  const db = serviceDb();
  const ids = [...new Set(normalized.map((job) => job.extension_id))];
  const existingExtensions = await db.from("extensions").select("id").in("id", ids);
  if (existingExtensions.error) return NextResponse.json({ error: "Extension inventory lookup failed." }, { status: 503 });
  const existingIds = new Set((existingExtensions.data || []).map((row) => String(row.id)));
  const missing = normalized.filter((job) => !existingIds.has(job.extension_id)).map((job) => {
    const [publisher, ...nameParts] = job.extension_id.split(".");
    const name = nameParts.join(".");
    existingIds.add(job.extension_id);
    return { id: job.extension_id, name, display_name: name, publisher, description: "", registry: job.registry };
  });
  if (missing.length) {
    const inserted = await db.from("extensions").insert(missing);
    if (inserted.error) return NextResponse.json({ error: "Missing extensions could not be registered." }, { status: 503 });
  }

  const versionRows = normalized.map((job) => ({ extension_id: job.extension_id, version: job.version, registry: job.registry, is_latest: false, scan_state: "queued" }));
  const versions = await db.from("extension_versions").upsert(versionRows, { onConflict: "extension_id,version" });
  if (versions.error) return NextResponse.json({ error: "Artifact versions could not be queued." }, { status: 503 });

  const queued: Array<{ id: string; extension_id: string; version: string; scan_purpose: string; deduplicated: boolean }> = [];
  for (const requested of normalized) {
    const active = await db.from("scan_jobs").select("id,extension_id,version,scan_purpose").eq("extension_id", requested.extension_id).eq("version", requested.version).eq("profile", "deep").in("status", ["queued", "running"]).maybeSingle();
    if (active.error) return NextResponse.json({ error: "Active scan lookup failed." }, { status: 503 });
    if (active.data) {
      queued.push({ ...active.data, deduplicated: true });
      continue;
    }
    const inserted = await db.from("scan_jobs").insert({ extension_id: requested.extension_id, version: requested.version, profile: "deep", requester_hash: `canonical-${requested.scan_purpose}`, scan_purpose: requested.scan_purpose, status: "queued" }).select("id,extension_id,version,scan_purpose").single();
    if (inserted.error) return NextResponse.json({ error: `Could not queue ${requested.extension_id}@${requested.version}.` }, { status: 503 });
    queued.push({ ...inserted.data, deduplicated: false });
  }
  return NextResponse.json({ jobs: queued });
}

function normalizeJob(job: RequestedJob) {
  const extensionId = String(job.extension_id || "").trim();
  const version = String(job.version || "").trim();
  const purpose = String(job.scan_purpose || "");
  const registry = String(job.registry || "vs-marketplace");
  if (!extensionPattern.test(extensionId) || !versionPattern.test(version) || !allowedPurposes.has(purpose) || !["vs-marketplace", "openvsx"].includes(registry)) return null;
  return { extension_id: extensionId, version, scan_purpose: purpose as "benchmark" | "public_intelligence", registry: registry as "vs-marketplace" | "openvsx" };
}
