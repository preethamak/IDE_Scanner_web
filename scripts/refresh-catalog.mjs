import { createClient } from "@supabase/supabase-js";

const gallery = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const scanLimit = Number(process.env.SCAN_BATCH_LIMIT || 100);
const refreshStartedAt = new Date().toISOString();

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
    return (values.length ? values : [extension.version]).map((version, index) => ({ ...extension, version, published_at: version === raw.version ? raw.timestamp : null, is_latest: version === raw.version || index === 0, download_url: version === raw.version ? String(raw.files?.download || "") : `https://open-vsx.org/api/${encodeURIComponent(extension.publisher)}/${encodeURIComponent(extension.name)}/${encodeURIComponent(version)}/file/${encodeURIComponent(extension.publisher)}.${encodeURIComponent(extension.name)}-${encodeURIComponent(version)}.vsix` }));
  }
  const payload = await queryGallery({ filters: [{ criteria: [{ filterType: 7, value: extension.id }], pageNumber: 1, pageSize: 1 }], flags: 402 });
  return (payload.results?.[0]?.extensions?.[0]?.versions || []).map((version, index) => ({ ...extension, version: version.version, published_at: version.lastUpdated || null, is_latest: index === 0, download_url: `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${encodeURIComponent(extension.publisher)}/vsextensions/${encodeURIComponent(extension.name)}/${encodeURIComponent(version.version)}/vspackage` }));
}

const [marketplacePages, openVsx] = await Promise.all([Promise.all([1, 2, 3].map(marketplacePage)), openVsxTop()]);
const marketplace = marketplacePages.flat().map(normalizeMarketplace);
const combined = [...marketplace, ...openVsx];
const unique = new Map(); for (const item of combined.sort((a, b) => b.installs - a.installs)) if (!unique.has(item.id.toLowerCase())) unique.set(item.id.toLowerCase(), item);
const cohort = [...unique.values()].slice(0, 250).map((item, index) => ({ ...item, catalog_rank: index + 1 }));

const refreshRows = ["vs-marketplace", "openvsx"].map((registry) => ({ registry, status: "running", started_at: refreshStartedAt }));
await db.from("registry_refreshes").insert(refreshRows);
const refreshIds = new Map();
const createdRefreshes = await db.from("registry_refreshes").select("id,registry").eq("started_at", refreshStartedAt);
for (const row of createdRefreshes.data || []) refreshIds.set(row.registry, row.id);

for (const extension of cohort) {
  const { error } = await db.from("extensions").upsert({ id: extension.id, name: extension.name, display_name: extension.display_name, publisher: extension.publisher, description: extension.description, registry: extension.registry, publisher_verified: extension.publisher_verified, installs: extension.installs, rating: extension.rating, icon_url: extension.icon_url, last_published_at: extension.last_published_at, catalog_rank: extension.catalog_rank, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}

let queued = 0;
const queuedByRegistry = { "vs-marketplace": 0, openvsx: 0 };
for (const extension of cohort) {
  const versions = await versionsFor(extension).catch(() => [extension]);
  const seenVersions = new Set();
  const rows = versions
    .map((item, index) => ({ extension_id: extension.id, version: item.version, registry: extension.registry, published_at: item.published_at, download_url: item.download_url || null, is_latest: Boolean(item.is_latest ?? index === 0), discovered_at: refreshStartedAt, last_seen_at: refreshStartedAt }))
    .filter((item) => {
      if (!item.version || seenVersions.has(item.version)) return false;
      seenVersions.add(item.version);
      return true;
    });
  // Remember which releases existed before this refresh. A watch alert is only
  // useful for a newly observed release; repeating it every six hours would
  // train people to ignore the monitor.
  const existingVersions = rows.length
    ? await db.from("extension_versions").select("version").eq("extension_id", extension.id).in("version", rows.map((item) => item.version))
    : { data: [], error: null };
  if (existingVersions.error) throw existingVersions.error;
  const known = new Set((existingVersions.data || []).map((item) => item.version));
  const newlyObserved = rows.filter((item) => !known.has(item.version) && item.is_latest);
  if (rows.length) { const result = await db.from("extension_versions").upsert(rows, { onConflict: "extension_id,version" }); if (result.error) throw result.error; }
  for (const release of newlyObserved) await notifyWatchersOfRelease(extension.id, release.version);
  for (const item of rows.slice(0, 4)) {
    if (queued >= scanLimit) break;
    const existing = await db.from("extension_versions").select("scan_state").eq("extension_id", extension.id).eq("version", item.version).single();
    if (["complete", "queued", "running"].includes(existing.data?.scan_state)) continue;
    const job = await db.from("scan_jobs").insert({ extension_id: extension.id, version: item.version, profile: "deep", requester_hash: "catalog-refresh", scan_purpose: "public_intelligence" }).select("id").single();
    if (job.error) continue;
    await db.from("extension_versions").update({ scan_state: "queued" }).eq("extension_id", extension.id).eq("version", item.version);
    queued += 1;
    queuedByRegistry[extension.registry] += 1;
  }
}

async function notifyWatchersOfRelease(extensionId, version) {
  const items = await db.from("watchlist_items").select("watchlist_id,watchlists(owner_id)").eq("extension_id", extensionId);
  if (items.error) throw items.error;
  const owners = [...new Set((items.data || []).map((item) => item.watchlists?.owner_id).filter(Boolean))];
  if (!owners.length) return;
  const preferences = await db.from("monitoring_preferences").select("owner_id,in_app_enabled,release_alerts").in("owner_id", owners);
  if (preferences.error) throw preferences.error;
  const enabled = new Set((preferences.data || []).filter((item) => item.in_app_enabled && item.release_alerts).map((item) => item.owner_id));
  const alerts = owners.filter((ownerId) => enabled.has(ownerId)).map((ownerId) => ({
    owner_id: ownerId,
    extension_id: extensionId,
    version,
    kind: "release_detected",
    title: `New release detected: ${extensionId}@${version}`,
    summary: "A watched extension published a new exact artifact. Deep Scan has been queued; the alert will update when evidence is available.",
    metadata: { scan_queued: true },
    dedupe_key: `release:${extensionId}@${version}`,
  }));
  if (alerts.length) {
    const result = await db.from("monitoring_alerts").upsert(alerts, { onConflict: "owner_id,dedupe_key", ignoreDuplicates: true });
    if (result.error) throw result.error;
  }
}

const releasesByRegistry = { "vs-marketplace": 0, openvsx: 0 };
for (const item of cohort) releasesByRegistry[item.registry] += 1;
for (const registry of ["vs-marketplace", "openvsx"]) {
  const id = refreshIds.get(registry);
  if (!id) continue;
  await db.from("registry_refreshes").update({ status: "complete", completed_at: new Date().toISOString(), extensions_seen: cohort.filter((item) => item.registry === registry).length, releases_seen: releasesByRegistry[registry], releases_queued: queuedByRegistry[registry] }).eq("id", id);
}

console.log(JSON.stringify({ extensions: cohort.length, deep_scans_queued: queued }));
