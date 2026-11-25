import "server-only";
import { privateDb } from "@/lib/cloudflarePrivate";
import { runtimeServiceDb } from "@/lib/supabaseRuntime";
import { sectionByKey } from "./catalog";

type Row = Record<string, string | number | null>;
export type AdminData = { columns: string[]; rows: Row[]; next: boolean; metrics: { label: string; value: number | string }[]; daily: { day: string; value: number }[]; note?: string };
export type AdminFilters = { from: string; to: string; until: string; page: number; q: string };
export function adminFilters(params: URLSearchParams, now = new Date()): AdminFilters {
  const today = now.toISOString().slice(0, 10);
  const valid = (input: string | null) => !!input && /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input)) && new Date(input).toISOString().slice(0, 10) === input;
  const to = valid(params.get("to")) && params.get("to")! <= today ? params.get("to")! : today;
  const earliest = new Date(Date.parse(to) - 89 * 86_400_000).toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.parse(to) - 29 * 86_400_000).toISOString().slice(0, 10);
  let from = valid(params.get("from")) ? params.get("from")! : defaultFrom;
  if (from > to) from = to;
  if (from < earliest) from = earliest;
  const page = Math.min(10000, Math.max(1, Math.floor(Number(params.get("page")) || 1)));
  return { from, to, until: new Date(Date.parse(to) + 86_400_000).toISOString(), page, q: (params.get("q") || "").trim().slice(0, 120) };
}
const grouping: Record<string, { field: string; where?: string }> = {
  users: { field: "substr(occurred_at,1,10)", where: "name='page_view'" },
  "users/referrers": { field: "coalesce(nullif(referrer,''),'Direct / internal')", where: "name='page_view'" },
  "users/asn": { field: "coalesce(nullif(asn,''),'Unavailable')", where: "name='page_view'" },
  "users/locations": { field: "coalesce(nullif(country,''),'Unavailable')", where: "name='page_view'" },
  "users/devices": { field: "device || ' / ' || browser", where: "name='page_view'" },
  "traffic/pages": { field: "path", where: "name='page_view'" },
  "traffic/utm": { field: "coalesce(nullif(utm_source,''),'None') || ' / ' || coalesce(nullif(utm_medium,''),'None') || ' / ' || coalesce(nullif(utm_campaign,''),'None')", where: "name='page_view'" },
  "engagements/queries": { field: "name", where: "name NOT IN ('page_view','login','provider_request','llm_request','mcp_request','blog_updated')" },
  "engagements/shares": { field: "name || ' / ' || path", where: "name IN ('share_copied','team_badge_copied')" },
  providers: { field: "provider || ' / ' || operation", where: "name IN ('provider_request','llm_request')" },
  llm: { field: "provider || ' / ' || operation", where: "name='llm_request'" },
  mcp: { field: "operation", where: "name='mcp_request'" },
  security: { field: "CASE WHEN bot_score IS NULL THEN 'Score unavailable' WHEN bot_score < 30 THEN 'Low score (1–29)' ELSE 'Higher score (30–99)' END", where: "name='page_view'" },
};
function emptyData(columns: string[], rows: Row[]): AdminData {
  return { columns, rows: rows.slice(0, 50), next: rows.length > 50, metrics: [], daily: [] };
}
export async function readAdminData(key: string, filters: AdminFilters): Promise<AdminData> {
  if (!sectionByKey(key)) throw new Error("Unknown dashboard section.");
  const db = privateDb();
  const { from, until, q, page } = filters;
  const offset = (page - 1) * 50;
  const dates = [from + "T00:00:00.000Z", until];
  if (key === "engagements/newsletter") {
    // Use runtime-bound credentials on Workers; never rely on a bundled service key.
    const supabase = runtimeServiceDb();
    if (!supabase) throw new Error("Newsletter analytics requires Supabase service credentials. Newsletter signup retains its existing configuration.");
    const response = await supabase.from("newsletter_subscribers").select("source,created_at", { count: "exact" }).gte("created_at", dates[0]).lt("created_at", until).ilike("source", `%${q}%`).order("created_at", { ascending: false }).range(offset, offset + 50);
    if (response.error) throw new Error("Newsletter data is unavailable from Supabase.");
    return { ...emptyData(["source", "created_at"], response.data || []), metrics: [{ label: "New subscribers in period", value: response.count || 0 }], note: "Subscription records from Supabase; email addresses are intentionally excluded from this analytics view." };
  }
  if (key === "users/all") {
    const rows = await db.prepare("SELECT id,display_name,email,provider,created_at FROM app_users WHERE created_at>=? AND created_at<? AND (email LIKE ? OR display_name LIKE ? OR id=?) ORDER BY created_at DESC,id LIMIT 51 OFFSET ?").bind(...dates, `%${q}%`, `%${q}%`, q, offset).all<Row>();
    const counts = await db.prepare("SELECT count(*) AS total FROM app_users WHERE created_at>=? AND created_at<?").bind(...dates).first<Row>();
    return { ...emptyData(["id", "display_name", "email", "provider", "created_at"], rows.results), metrics: [{ label: "Accounts created in period", value: Number(counts?.total || 0) }], note: "Accounts are shown by registration date, including users who decline optional visitor analytics." };
  }
  if (key === "jobs") {
    const rows = await db.prepare("SELECT id,extension_id,version,status,lifecycle_stage,attempt_count,created_at,completed_at FROM app_scan_jobs WHERE created_at>=? AND created_at<? AND (extension_id LIKE ? OR status LIKE ? OR id=?) ORDER BY created_at DESC,id LIMIT 51 OFFSET ?").bind(...dates, `%${q}%`, `%${q}%`, q, offset).all<Row>();
    const counts = await db.prepare("SELECT status,count(*) AS count FROM app_scan_jobs WHERE created_at>=? AND created_at<? GROUP BY status").bind(...dates).all<Row>();
    return { ...emptyData(["id", "extension_id", "version", "status", "lifecycle_stage", "attempt_count", "created_at", "completed_at"], rows.results), metrics: counts.results.map(row => ({ label: String(row.status), value: Number(row.count) })) };
  }
  if (key === "content") {
    const rows = await db.prepare("SELECT id,slug,title,summary,status,version,updated_at,published_at FROM app_blog_posts WHERE title LIKE ? OR slug LIKE ? ORDER BY updated_at DESC,id LIMIT 51 OFFSET ?").bind(`%${q}%`, `%${q}%`, offset).all<Row>();
    return { ...emptyData(["title", "slug", "status", "version", "updated_at"], rows.results), note: "Drafts are private. Published posts appear at /blog. Dates do not filter the content library." };
  }
  if (key === "users/login") {
    const rows = await db.prepare("SELECT occurred_at,user_id FROM app_analytics_events WHERE name='login' AND occurred_at>=? AND occurred_at<? AND coalesce(user_id,'') LIKE ? ORDER BY occurred_at DESC,id LIMIT 51 OFFSET ?").bind(...dates, `%${q}%`, offset).all<Row>();
    return emptyData(["occurred_at", "user_id"], rows.results);
  }
  if (key === "users/paths") {
    const rows = await db.prepare(`SELECT substr(session_id,1,12) AS session,group_concat(path,' → ') AS path,count(*) AS views FROM (SELECT session_id,path,occurred_at FROM app_analytics_events WHERE name='page_view' AND session_id!='' AND occurred_at>=? AND occurred_at<? AND path LIKE ? ORDER BY occurred_at,id) GROUP BY session_id ORDER BY max(occurred_at) DESC,session_id LIMIT 51 OFFSET ?`).bind(...dates, `%${q}%`, offset).all<Row>();
    return { ...emptyData(["session", "path", "views"], rows.results), note: "30-minute idle sessions. Filters apply to each page in the sequence; the session label is a truncated pseudonymous hash." };
  }
  const config = grouping[key];
  if (!config) throw new Error("Unknown dashboard section.");
  const where = `occurred_at>=? AND occurred_at<? AND ${config.where || "1=1"} AND (${config.field}) LIKE ?`;
  const values = [...dates, `%${q}%`];
  const rows = await db.prepare(`SELECT ${config.field} AS dimension,count(*) AS events,count(DISTINCT NULLIF(session_id,'')) AS sessions,count(DISTINCT user_id) AS signed_in_users,sum(CASE WHEN status=0 OR status>=400 THEN 1 ELSE 0 END) AS failed_requests,round(avg(duration_ms)) AS avg_ms FROM app_analytics_events WHERE ${where} GROUP BY dimension ORDER BY events DESC,dimension LIMIT 51 OFFSET ?`).bind(...values, offset).all<Row>();
  const count = await db.prepare(`SELECT count(*) AS events,count(DISTINCT NULLIF(session_id,'')) AS sessions,count(DISTINCT user_id) AS users FROM app_analytics_events WHERE ${where}`).bind(...values).first<Row>();
  const daily = await db.prepare(`SELECT substr(occurred_at,1,10) AS day,count(*) AS value FROM app_analytics_events WHERE ${where} GROUP BY day ORDER BY day`).bind(...values).all<{ day: string; value: number }>();
  const requests = ["llm", "mcp", "providers"].includes(key);
  const result = emptyData(requests ? ["dimension", "events", "failed_requests", "avg_ms"] : ["dimension", "events", "sessions", "signed_in_users"], rows.results);
  const lookup = new Map(daily.results.map(row => [row.day, row.value]));
  for (let time = Date.parse(from); time < Date.parse(until); time += 86_400_000) {
    const day = new Date(time).toISOString().slice(0, 10); result.daily.push({ day, value: lookup.get(day) || 0 });
  }
  result.metrics = [{ label: requests ? "Requests" : "Events", value: Number(count?.events || 0) }];
  if (!requests) result.metrics.push({ label: "Visitor sessions", value: Number(count?.sessions || 0) }, { label: "Signed-in users", value: Number(count?.users || 0) });
  result.note = key === "security" ? "Bot scores require Cloudflare Bot Management. Unavailable scores stay unknown; this page does not call IPQS or make fraud decisions." : requests ? "HTTP failures and network errors only; successful HTTP responses may still contain application-level errors. Latency includes the upstream request until response headers. Token counts and cost are not inferred." : "Optional visitor analytics starts after consent and deployment. Empty history is expected before collection; users who decline are excluded.";
  return result;
}
