import { NextResponse } from "next/server";
import { normalizeMarketplaceId } from "@/lib/marketplace";
import { serverDb } from "@/lib/supabaseServer";
import { queueDeepScan } from "@/lib/deepScan";

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
    let query = db.from("scan_jobs").select("id,extension_id,version,profile,status,error,created_at,started_at,completed_at").eq("extension_id", extensionId).eq("requested_by", user.id).order("created_at", { ascending: false }).limit(1);
    if (version) query = query.eq("version", version);
    const result = await query.maybeSingle();
    if (result.error) throw result.error;
    return result.data ? NextResponse.json(result.data) : new NextResponse(null, { status: 204 });
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
