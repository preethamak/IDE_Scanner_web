import { NextResponse } from "next/server";
import { getPublicationHealth } from "@/lib/publicationHealth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.LAUNCH_HEALTH_SECRET || "";
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const health = await getPublicationHealth();
    return NextResponse.json(health, { status: health.healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Launch health unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
