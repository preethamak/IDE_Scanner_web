import { NextResponse } from "next/server";
import { profileForUser, userFromSession } from "@/lib/cloudflarePrivate";
import { serverDb } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await userFromSession(request);
    if (user) {
      return NextResponse.json({ user: { id: user.id, email: user.email, provider: user.provider, display_name: user.display_name }, profile: await profileForUser(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    // Keep legacy Supabase sessions usable while accounts migrate to the D1
    // session model. The browser can then use the same account/workspace UI
    // without being sent through onboarding a second time.
    const db = await serverDb();
    const result = await db.auth.getUser();
    if (result.error || !result.data.user) throw result.error || new Error("No Supabase session.");
    const profile = await db.from("profiles").select("*").eq("id", result.data.user.id).maybeSingle();
    return NextResponse.json({
      user: {
        id: result.data.user.id,
        email: result.data.user.email || "",
        provider: result.data.user.app_metadata?.provider || result.data.user.identities?.[0]?.provider || "supabase",
        display_name: result.data.user.user_metadata?.full_name || result.data.user.user_metadata?.name || "",
      },
      profile: profile.data || null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ user: null, profile: null }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
