import { createClient } from "@supabase/supabase-js";

const gallery = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const scanLimit = Number(process.env.SCAN_BATCH_LIMIT || 100);

async function queryGallery(body) {
  const response = await fetch(gallery, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json;api-version=7.2-preview.1" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Marketplace returned ${response.status}`);
  return response.json();
}

async function marketplacePage(page) {
  const payload = await queryGallery({ filters: [{ criteria: [{ filterType: 8, value: "Microsoft.VisualStudio.Code" }], pageNumber: page, pageSize: 100, sortBy: 4 }], flags: 914 });
  return payload.results?.[0]?.extensions || [];
}

function normalizeMarketplace(raw) {
  const publisher = raw.publisher?.publisherName || "unknown"; const name = raw.extensionName; const version = raw.versions?.[0] || {};
  const stats = Object.fromEntries((raw.statistics || []).map((item) => [String(item.statisticName).toLowerCase(), Number(item.value || 0)]));
  const icon = version.files?.find((item) => item.assetType?.includes("Icons.Small"))?.source || "";
  return { id: `${publisher}.${name}`, name, display_name: raw.displayName || name, publisher, description: raw.shortDescription || "", registry: "vs-marketplace", publisher_verified: Boolean(raw.publisher?.isDomainVerified || raw.publisher?.isVerified), installs: stats.install || 0, rating: stats.averagerating || 0, icon_url: icon, last_published_at: version.lastUpdated || raw.lastUpdated || null, version: version.version || "", published_at: version.lastUpdated || null };
}

async function openVsxTop() {
  const response = await fetch("https://open-vsx.org/api/-/search?size=100&sortBy=downloadCount&sortOrder=desc");
  if (!response.ok) return [];
  const payload = await response.json();
  return (payload.extensions || []).map((raw) => ({ id: `${raw.namespace}.${raw.name}`, name: raw.name, display_name: raw.displayName || raw.name, publisher: raw.namespace, description: raw.description || "", registry: "openvsx", publisher_verified: Boolean(raw.verified), installs: Number(raw.downloadCount || 0), rating: Number(raw.averageRating || 0), icon_url: raw.files?.icon || "", last_published_at: raw.timestamp || null, version: raw.version || "", published_at: raw.timestamp || null }));
}

async function versionsFor(extension) {
  if (extension.registry === "openvsx") {
    const response = await fetch(`https://open-vsx.org/api/${encodeURIComponent(extension.publisher)}/${encodeURIComponent(extension.name)}`);
    if (!response.ok) return [extension];
    const raw = await response.json(); const values = Object.keys(raw.allVersions || {});
    return (values.length ? values : [extension.version]).map((version, index) => ({ ...extension, version, published_at: version === raw.version ? raw.timestamp : null, is_latest: version === raw.version || index === 0 }));
  }
  const payload = await queryGallery({ filters: [{ criteria: [{ filterType: 7, value: extension.id }], pageNumber: 1, pageSize: 1 }], flags: 402 });
  return (payload.results?.[0]?.extensions?.[0]?.versions || []).map((version, index) => ({ ...extension, version: version.version, published_at: version.lastUpdated || null, is_latest: index === 0 }));
}

async function dispatch(jobId, extensionId, version) {
  const response = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER || "preethamak"}/${process.env.GITHUB_SCANNER_REPO || "IDE_Scanner"}/actions/workflows/deep-scan.yml/dispatches`, { method: "POST", headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_ACTIONS_TOKEN}`, "Content-Type": "application/json", "X-GitHub-Api-Version": "2026-03-10" }, body: JSON.stringify({ ref: "main", inputs: { job_id: jobId, extension_id: extensionId, version, callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/scan-results` } }) });
  if (!response.ok) throw new Error(`Dispatch ${extensionId}@${version} returned ${response.status}`);
}

const marketplace = (await Promise.all([1, 2, 3].map(marketplacePage))).flat().map(normalizeMarketplace);
const combined = [...marketplace, ...await openVsxTop()];
const unique = new Map(); for (const item of combined.sort((a, b) => b.installs - a.installs)) if (!unique.has(item.id.toLowerCase())) unique.set(item.id.toLowerCase(), item);
const cohort = [...unique.values()].slice(0, 250).map((item, index) => ({ ...item, catalog_rank: index + 1 }));

for (const extension of cohort) {
  const { error } = await db.from("extensions").upsert({ id: extension.id, name: extension.name, display_name: extension.display_name, publisher: extension.publisher, description: extension.description, registry: extension.registry, publisher_verified: extension.publisher_verified, installs: extension.installs, rating: extension.rating, icon_url: extension.icon_url, last_published_at: extension.last_published_at, catalog_rank: extension.catalog_rank, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}

let queued = 0;
for (const extension of cohort) {
  const versions = await versionsFor(extension).catch(() => [extension]);
  const rows = versions.map((item, index) => ({ extension_id: extension.id, version: item.version, registry: extension.registry, published_at: item.published_at, is_latest: Boolean(item.is_latest ?? index === 0) }));
  if (rows.length) { const result = await db.from("extension_versions").upsert(rows, { onConflict: "extension_id,version" }); if (result.error) throw result.error; }
  for (const item of rows.slice(0, 4)) {
    if (queued >= scanLimit) break;
    const existing = await db.from("extension_versions").select("scan_state").eq("extension_id", extension.id).eq("version", item.version).single();
    if (["complete", "queued", "running"].includes(existing.data?.scan_state)) continue;
    const job = await db.from("scan_jobs").insert({ extension_id: extension.id, version: item.version, profile: "deep", requester_hash: "catalog-refresh" }).select("id").single();
    if (job.error) continue;
    await db.from("extension_versions").update({ scan_state: "queued" }).eq("extension_id", extension.id).eq("version", item.version);
    await dispatch(job.data.id, extension.id, item.version);
    queued += 1;
  }
}

console.log(JSON.stringify({ extensions: cohort.length, deep_scans_queued: queued }));
