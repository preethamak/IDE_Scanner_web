import { NextResponse } from "next/server";
import { getPublicStatus } from "@/lib/publicStatus";
export const dynamic = "force-dynamic";
export async function GET() {
  const status = await getPublicStatus();
  return NextResponse.json(status, {
    status: status.overall === "outage" ? 503 : 200,
    headers: {
      "Cache-Control":
        "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
