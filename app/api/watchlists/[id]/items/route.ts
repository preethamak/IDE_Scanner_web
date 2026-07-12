import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { db } = await authenticated(request); const { id } = await context.params; const body = await request.json(); const { error } = await db.from("watchlist_items").upsert({ watchlist_id: id, extension_id: String(body.extension_id || "") }); if (error) throw error; return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist update failed." }, { status: 400 }); }
}
