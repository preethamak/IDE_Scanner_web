import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_watchlist_items").select("extension_id,created_at,extensions(display_name,icon_url)").eq("team_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ items: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team watchlist lookup failed." }, { status: 403 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst"]);
    const body = await request.json(); const extensionId = typeof body.extension_id === "string" ? body.extension_id.trim() : "";
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extensionId)) return NextResponse.json({ error: "A valid extension id is required." }, { status: 400 });
    const db = serviceDb(); const { data: extension, error: extensionError } = await db.from("extensions").select("id").ilike("id", extensionId).maybeSingle();
    if (extensionError) throw extensionError;
    if (!extension) return NextResponse.json({ error: "Add this extension to the registry before monitoring it." }, { status: 404 });
    const { data, error } = await db.from("team_watchlist_items").upsert({ team_id: id, extension_id: extension.id, created_by: user.id }, { onConflict: "team_id,extension_id" }).select("extension_id,created_at").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Team watchlist update failed." }, { status: 403 }); }
}
