import { NextResponse } from "next/server";
import { validBearerSecret } from "@/lib/internalRunnerAuth";
import { runtimeEnv } from "@/lib/runtimeEnv";
import { privateDb } from "@/lib/cloudflarePrivate";
import { reconcileCloudflareBadgeHealth } from "@/lib/cloudflareBadgeHealth";

export const dynamic = "force-dynamic";

/** Protected backstop for an immediate workspace monitoring reconciliation. */
export async function POST(request: Request) {
  if (!validBearerSecret(request.headers.get("authorization"), runtimeEnv("NOTIFICATION_CRON_SECRET")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await reconcileCloudflareBadgeHealth(privateDb() as unknown as D1Database);
    return NextResponse.json({ storage: "cloudflare_d1", ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Monitoring reconciliation failed." }, { status: 500 });
  }
}
