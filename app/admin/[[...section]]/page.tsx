import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownToLine, Database } from "lucide-react";
import { requireAdminPage } from "@/lib/admin/access";
import { sectionPermission } from "@/lib/admin/permissions";
import { sectionByKey } from "@/lib/admin/catalog";
import { adminFilters, readAdminData, type AdminData } from "@/lib/admin/data";
import AdminTable from "../AdminTable";
import RefreshButton from "../RefreshButton";
import ContentEditor from "../ContentEditor";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ section?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function AdminPage({ params, searchParams }: Props) {
  const key = (await params).section?.join("/") || "users";
  const section = sectionByKey(key); if (!section) notFound();
  await requireAdminPage(sectionPermission(key));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") query.set(key, value);
  const filters = adminFilters(query); query.set("from", filters.from); query.set("to", filters.to); query.set("q", filters.q); query.set("page", String(filters.page));
  const url = `/admin/${key}`;
  const pageLink = (page: number) => { const next = new URLSearchParams(query); next.set("page", String(page)); return `${url}?${next}`; };
  let data: AdminData | null = null; let error = "";
  try { data = await readAdminData(key, filters); } catch (failure) { error = key === "engagements/newsletter" && failure instanceof Error ? failure.message : "Data is unavailable. Check that the admin migration has been applied to ABSCISSA_SCAN_DATA and the service bindings are configured."; }
  const peak = Math.max(1, ...data?.daily.map(point => point.value) || []);
  return <main className="adminPage"><div className="adminHeading"><div><p className="adminEyebrow">{section.group} <span>/</span> {section.title}</p><h1>{section.title}</h1><p>{section.description}</p></div><div className="adminHeadingActions"><RefreshButton /><a href={`/api/admin/${key}?${query}&format=csv`}><ArrowDownToLine size={15} /> Export page</a></div></div>
    <form className="adminFilters" action={url}><label>From (UTC)<input type="date" name="from" defaultValue={filters.from} max={filters.to} /></label><label>To (UTC)<input type="date" name="to" defaultValue={filters.to} /></label><label className="adminSearch">Filter records<input type="search" name="q" maxLength={120} defaultValue={filters.q} placeholder="Filter by dimension or record" /></label><button className="adminPrimary">Apply filters</button></form>
    <p className="adminRange">{filters.from} — {filters.to} · UTC · up to 90 days · page {filters.page}</p>
    {error ? <div className="adminNotice" role="alert"><Database size={22} /><div><h2>Connection needs attention</h2><p>{error}</p><p>See docs/admin-dashboard.md for configuration and verification.</p></div></div> : null}
    {data ? <><section className="adminMetrics" aria-label="Period totals">{data.metrics.map(metric => <article key={metric.label}><span>{metric.label}</span><strong>{typeof metric.value === "number" ? metric.value.toLocaleString("en-IN") : metric.value}</strong><small>Selected period{filters.q ? " · filter applied where supported" : ""}</small></article>)}</section>
    {data.daily.length ? <section className="adminPanel"><header className="adminPanelHead"><h2>Activity over time</h2><span>Daily event count · UTC</span></header><div className="adminChart" role="img" aria-label={`Daily events from ${filters.from} to ${filters.to}. ${data.metrics[0]?.value || 0} total events.`}>{data.daily.map(point => <div className="adminChartColumn" key={point.day} title={`${point.day}: ${point.value}`}><span style={{ height: `${Math.max(1, point.value / peak * 100)}%` }} /><small>{point.day.slice(5)}</small></div>)}</div><details className="adminChartValues"><summary>View daily values</summary><AdminTable columns={["day", "value"]} rows={data.daily} /></details></section> : null}
    {data.note ? <p className="adminDataNote">{data.note}</p> : null}
    <section className="adminPanel"><header className="adminPanelHead"><h2>{section.source === "content" ? "Articles" : "Recorded activity"}</h2><span>{data.rows.length} records on this page</span></header>{data.rows.length ? <AdminTable columns={data.columns} rows={data.rows} /> : <div className="adminEmpty"><Database size={27} /><h2>No records for this selection</h2><p>Try a different date range or clear the filter. New activity appears here after it is recorded.</p></div>}<div className="adminPagination"><span>Page {filters.page} · 50 records per page</span><div>{filters.page > 1 ? <Link href={pageLink(filters.page - 1)}>← Previous</Link> : <span aria-disabled="true">← Previous</span>}{data.next ? <Link href={pageLink(filters.page + 1)}>Next →</Link> : <span aria-disabled="true">Next →</span>}</div></div></section>
    {key === "content" ? <ContentEditor posts={data.rows.map(row => ({ id: String(row.id), title: String(row.title), status: String(row.status) }))} /> : null}</> : null}
  </main>;
}
