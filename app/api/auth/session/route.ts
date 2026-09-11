import { NextResponse } from "next/server";
import { profileForUser, userFromSession } from "@/lib/cloudflarePrivate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await userFromSession(request);
    if (!user) return NextResponse.json({ user: null, profile: null }, { headers: { "Cache-Control": "private, no-store" } });
    return NextResponse.json({ user: { id: user.id, email: user.email, provider: user.provider, display_name: user.display_name }, profile: await profileForUser(user.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ user: null, profile: null }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
