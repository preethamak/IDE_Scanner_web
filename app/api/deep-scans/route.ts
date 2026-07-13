import { NextResponse } from "next/server";
import { normalizeMarketplaceId } from "@/lib/marketplace";
import { serverDb } from "@/lib/supabaseServer";
import { queueDeepScan } from "@/lib/deepScan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { extension_id?: string; version?: string };
  try {
    const extensionId = normalizeMarketplaceId(String(payload.extension_id || ""));
    const db = await serverDb(); const { data: { user } } = await db.auth.getUser(); if (!user) return NextResponse.json({ error: "Sign in to request a Deep Scan.", code: "auth_required" }, { status: 401 });
    const result=await queueDeepScan(extensionId,payload.version?.trim()||undefined,request,user.id);
    return NextResponse.json(result,{status:String(result.status)==="complete"?200:202});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Deep Scan is temporarily unavailable.", code: "scan_unavailable" }, { status: 503 });
  }
}
