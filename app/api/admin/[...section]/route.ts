import { NextResponse } from "next/server";
import { AdminAccessError, requireAdmin } from "@/lib/admin/access";
import { privateResponseHeaders, sectionByKey } from "@/lib/admin/catalog";
import { adminFilters, readAdminData } from "@/lib/admin/data";
import { ContentError, savePost } from "@/lib/admin/content";
import { boundedJson, csvCell, sameOrigin } from "@/lib/admin/validation";
import { privateDb } from "@/lib/cloudflarePrivate";
import { recordOperationalEvent } from "@/lib/admin/telemetry";
export const dynamic = "force-dynamic";
const headers = privateResponseHeaders;
type Context = { params: Promise<{ section: string[] }> };
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request);
    const key = (await context.params).section.join("/"); const url = new URL(request.url);
    if (!sectionByKey(key)) return NextResponse.json({ error: "Not found." }, { status: 404, headers });
    if (key === "content" && url.searchParams.get("id")) {
      const post = await privateDb().prepare("SELECT * FROM app_blog_posts WHERE id=?").bind(url.searchParams.get("id")).first();
      return NextResponse.json(post || { error: "Not found." }, { status: post ? 200 : 404, headers });
    }
    const data = await readAdminData(key, adminFilters(url.searchParams));
    if (url.searchParams.get("format") === "csv") {
      const csv = [data.columns.map(csvCell).join(","), ...data.rows.map(row => data.columns.map(column => csvCell(row[column])).join(","))].join("\r\n");
      return new Response(csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="abscissa-admin-page.csv"' } });
    }
    return NextResponse.json(data, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = await requireAdmin(request);
    if (!sameOrigin(request)) return NextResponse.json({ error: "Origin rejected." }, { status: 403, headers });
    if ((await context.params).section.join("/") !== "content") return NextResponse.json({ error: "Method not allowed." }, { status: 405, headers });
    let body;
    try { body = await boundedJson(request, 150_000); } catch { return NextResponse.json({ error: "Invalid article or request too large." }, { status: 400, headers }); }
    const post = await savePost(body, user.id);
    await recordOperationalEvent({ name: "blog_updated", user_id: user.id });
    return NextResponse.json(post, { status: body.id ? 200 : 201, headers });
  } catch (error) { return failure(error); }
}
function failure(error: unknown) {
  if (error instanceof AdminAccessError || error instanceof ContentError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
  console.error("[admin] data operation failed");
  return NextResponse.json({ error: "Data is unavailable. Check the database migration and service configuration." }, { status: 503, headers });
}
