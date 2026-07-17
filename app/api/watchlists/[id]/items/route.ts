import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { resolveMarketplaceExtension } from "@/lib/marketplace";
import { serviceDb } from "@/lib/supabase";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { db } = await authenticated(request); const { id } = await context.params; const body = await request.json();
    const extensionId = String(body.extension_id || "").trim();
    if (!extensionId) return NextResponse.json({ error: "extension_id is required." }, { status: 400 });
    // Verify the owner before using the service role to cache public registry metadata.
    const ownership = await db.from("watchlists").select("id").eq("id", id).maybeSingle();
    if (ownership.error || !ownership.data) return NextResponse.json({ error: "Watchlist not found." }, { status: 404 });
    const extension = await resolveMarketplaceExtension(extensionId);
    const service = serviceDb();
    const extensionResult = await service.from("extensions").upsert({ id: extension.extension_id, name: extension.extension_id.split(".").slice(1).join("."), display_name: extension.display_name, publisher: extension.publisher, description: extension.short_description || "", registry: extension.registry || "vs-marketplace", publisher_verified: Boolean(extension.publisher_verified), installs: Number(extension.install_count || 0), rating: Number(extension.rating_average || 0), icon_url: extension.icon_url || "", repository_url: "", updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (extensionResult.error) throw extensionResult.error;
    const { error } = await db.from("watchlist_items").upsert({ watchlist_id: id, extension_id: extension.extension_id });
    if (error) throw error;
    return NextResponse.json({ ok: true, extension });
  }
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
