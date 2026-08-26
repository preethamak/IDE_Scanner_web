import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("A valid email is required.");
    const db = serviceDb();
    const requester = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const hash = createHash("sha256").update(`${process.env.SCAN_RATE_LIMIT_SECRET || "ide-scanner"}:${requester}`).digest("hex");
    const result = await db.rpc("subscribe_newsletter", { p_email: email, p_source: String(body.source || "footer"), p_requester_hash: hash });
    if (result.error) throw result.error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Subscription failed.";
    console.error("[newsletter]", message);
    if (/credential|not configured|supabase/i.test(message)) {
      return NextResponse.json(
        { error: "Signup is temporarily unavailable. Email hello@abscissa.dev and we will add you manually." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
