import { NextResponse } from "next/server";
import { normalizeMarketplaceId } from "@/lib/marketplace";
import { serviceDb } from "@/lib/supabase";
import { serverDb } from "@/lib/supabaseServer";
import { queueDeepScan } from "@/lib/deepScan";
import { scanProgressColumns, scanProgressPayload } from "@/lib/scanProgress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = await serverDb();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to view Deep Scan progress.", code: "auth_required" }, { status: 401 });
    const url = new URL(request.url);
    const extensionId = normalizeMarketplaceId(url.searchParams.get("extension_id") || "");
    const version = (url.searchParams.get("version") || "").trim();
    const service = serviceDb();
    const subscriptions = await service.from("scan_job_subscribers").select("job_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (subscriptions.error) throw subscriptions.error;
    const jobIds = (subscriptions.data || []).map((item) => String(item.job_id));
    if (!jobIds.length) return new NextResponse(null, { status: 204 });
    let query = service.from("scan_jobs").select(scanProgressColumns).in("id", jobIds).eq("extension_id", extensionId).order("created_at", { ascending: false }).limit(1);
    if (version) query = query.eq("version", version);
    const result = await query.maybeSingle();
    if (result.error) throw result.error;
    return result.data ? NextResponse.json(await scanProgressPayload(service, result.data)) : new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan lookup failed." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { extension_id?: string; version?: string };
  try {
    const db = await serverDb(); const { data: { user } } = await db.auth.getUser(); if (!user) return NextResponse.json({ error: "Sign in to request a Deep Scan.", code: "auth_required" }, { status: 401 });
    const extensionId = normalizeMarketplaceId(String(payload.extension_id || ""));
    const result=await queueDeepScan(extensionId,payload.version?.trim()||undefined,request,user.id);
    return NextResponse.json(result,{status:String(result.status)==="complete"?200:202});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deep Scan is temporarily unavailable.";
    const unavailable = message.includes("paused") || message.includes("temporarily");
    return NextResponse.json({ error: message, code: unavailable ? "runner_unavailable" : "scan_unavailable" }, { status: unavailable ? 503 : 400 });
  }
}
