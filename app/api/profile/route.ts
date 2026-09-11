import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { nowIso, privateDb, profileForUser } from "@/lib/cloudflarePrivate";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { db, user, provider } = await authenticated(request);
    if (provider === "cloudflare") return NextResponse.json({ user: { id: user.id, email: user.email, provider: user.app_metadata.provider }, profile: await profileForUser(user.id) });
    const result = await db!.from("profiles").select("*").eq("id", user.id).maybeSingle(); if (result.error) throw result.error; return NextResponse.json({ user: { id: user.id, email: user.email, provider: user.app_metadata.provider }, profile: result.data });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Profile lookup failed." }, { status: 401 }); }
}
export async function PATCH(request: Request) {
  try {
    const { db, user, provider } = await authenticated(request);
    const body = await request.json(); const role = String(body.role || ""); const primaryIde = String(body.primary_ide || ""); const useCase = String(body.use_case || "");
    if (!new Set(["developer","security","engineering_leader"]).has(role) || !new Set(["vscode","cursor","windsurf","vscodium","other"]).has(primaryIde) || !new Set(["personal","team"]).has(useCase)) throw new Error("Complete every onboarding field.");
    if (provider === "cloudflare") {
      const updatedAt = nowIso();
      await privateDb().prepare(`INSERT INTO app_profiles(user_id,role,primary_ide,use_case,onboarding_completed,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,primary_ide=excluded.primary_ide,use_case=excluded.use_case,onboarding_completed=1,updated_at=excluded.updated_at`).bind(user.id, role, primaryIde, useCase, 1, updatedAt).run();
      return NextResponse.json({ profile: { user_id: user.id, role, primary_ide: primaryIde, use_case: useCase, onboarding_completed: true, updated_at: updatedAt } });
    }
    const result = await db!.from("profiles").upsert({ id: user.id, display_name: String(body.display_name || user.user_metadata.full_name || user.user_metadata.user_name || "").slice(0, 80), role, primary_ide: primaryIde, use_case: useCase, onboarding_completed: true, updated_at: new Date().toISOString() }).select().single(); if (result.error) throw result.error; return NextResponse.json({ profile: result.data });
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Profile update failed." }, { status: 400 }); }
}
