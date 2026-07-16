import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await authenticated(request);
    const { id } = await context.params;
    const body = await request.json();
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return NextResponse.json({ error: "A watchlist name is required." }, { status: 400 });
    const { data, error } = await db.from("watchlists").update({ name }).eq("id", id).eq("owner_id", user.id).select("id,name").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Watchlist not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist update failed." }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db, user } = await authenticated(request);
    const { id } = await context.params;
    const { error } = await db.from("watchlists").delete().eq("id", id).eq("owner_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Watchlist deletion failed." }, { status: 400 }); }
}
