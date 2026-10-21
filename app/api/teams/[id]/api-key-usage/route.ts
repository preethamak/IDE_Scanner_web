import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";
import { serviceDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    if (provider === "cloudflare") {
      return NextResponse.json({ usage: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const url = new URL(request.url);
    const requestedKey = url.searchParams.get("key_id");
    const keyId = requestedKey ? asUuid(requestedKey) : null;
    if (requestedKey && !keyId) return NextResponse.json({ error: "key_id must be a UUID." }, { status: 400 });
    const requestedLimit = Number(url.searchParams.get("limit") || "50");
    const limit = Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 200 ? requestedLimit : 50;
    let query = serviceDb()
      .from("api_key_usage")
      .select("id,key_id,method,endpoint,created_at")
      .eq("team_id", id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (keyId) query = query.eq("key_id", keyId);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ usage: data || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = teamApiError(error, "API key usage is temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
