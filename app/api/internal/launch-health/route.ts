import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getPublicationHealth } from "@/lib/publicationHealth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.LAUNCH_HEALTH_SECRET || "";
  const bearer = request.headers.get("authorization"); const automation = request.headers.get("x-guardrails-health-token");
  const candidate = bearer === `Bearer ${secret}` ? secret : automation;
  if (!secret || !matchesSecret(candidate, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const health = await getPublicationHealth();
    return NextResponse.json(health, { status: health.healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Launch health unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

function matchesSecret(candidate: string | null, expected: string) {
  if (!candidate || candidate.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}
