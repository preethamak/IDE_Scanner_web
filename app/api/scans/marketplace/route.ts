import { NextResponse } from "next/server";
import { scanMarketplaceHosted } from "@/lib/hostedScanner";
import { normalizeMarketplaceId } from "@/lib/marketplace";
import { hasScannerService, scannerServiceRequest } from "@/lib/scannerService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({})) as { ids?: unknown; id?: unknown };
  const raw = Array.isArray(payload.ids) ? payload.ids[0] : payload.id;
  if (typeof raw !== "string" || !raw.trim()) return NextResponse.json({ error: "Provide one marketplace extension id or URL." }, { status: 400 });
  try {
    if (hasScannerService()) {
      const result = await scannerServiceRequest<Record<string, unknown>>("/v1/scans/marketplace", { method: "POST", body: JSON.stringify({ extension_id: normalizeMarketplaceId(raw) }) });
      return NextResponse.json({ ...result, analysis_level: "deep" }, { status: 202 });
    }
    const result = await scanMarketplaceHosted(raw);
    return NextResponse.json({ id: result.scanId, status: "complete", createdAt: Date.now(), updatedAt: Date.now(), error: null, summary: result.summary, report: result.report, analysis_level: "preliminary" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Hosted marketplace scan failed" }, { status: 502 });
  }
}
