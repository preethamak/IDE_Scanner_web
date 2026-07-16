import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { db } = await authenticated(request); const { id } = await context.params; const body = await request.json(); const { error } = await db.from("watchlist_items").upsert({ watchlist_id: id, extension_id: String(body.extension_id || "") }); if (error) throw error; return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist update failed." }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await authenticated(request);
    const { id } = await context.params;
    const extensionId = new URL(request.url).searchParams.get("extension_id") || "";
    if (!extensionId) return NextResponse.json({ error: "extension_id is required." }, { status: 400 });
    const { error } = await db.from("watchlist_items").delete().eq("watchlist_id", id).eq("extension_id", extensionId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist item removal failed." }, { status: 400 }); }
}
