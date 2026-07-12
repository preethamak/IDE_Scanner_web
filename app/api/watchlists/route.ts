import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const { db, user } = await authenticated(request); const { data, error } = await db.from("watchlists").select("*,watchlist_items(extension_id,created_at)").eq("owner_id", user.id).order("created_at"); if (error) throw error; return NextResponse.json({ watchlists: data }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist lookup failed." }, { status: 401 }); }
}
export async function POST(request: Request) {
  try { const { db, user } = await authenticated(request); const body = await request.json(); const { data, error } = await db.from("watchlists").insert({ owner_id: user.id, name: String(body.name || "My extensions").slice(0, 80) }).select().single(); if (error) throw error; return NextResponse.json(data, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist creation failed." }, { status: 400 }); }
}
