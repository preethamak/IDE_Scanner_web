import { NextResponse } from "next/server";
import { requestScanEvidence } from "@/lib/requestScanEvidence";
import { compareScanEvidence, evidenceAttribution, summarizeScan, type EvidenceRow, type ScanEvidence } from "@/lib/extensionComparison";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const fromScanId = url.searchParams.get("fromScanId") || undefined;
  const toScanId = url.searchParams.get("toScanId") || undefined;
  if (!from || !to || from === to) return NextResponse.json({ error: "Two different versions are required." }, { status: 400 });
  const extensionId = decodeURIComponent(id);
  const read = await requestScanEvidence(request);
  const [leftData, rightData] = (await Promise.all([read(extensionId, from, fromScanId), read(extensionId, to, toScanId)])).map(evidence);
  const summaries = { from: summarizeScan(from, leftData), to: summarizeScan(to, rightData) };
  const complete = (data: ScanEvidence) => Boolean(data.scan?.id) && String(data.scan?.analysis_status || "complete") === "complete";
  if (!complete(leftData) || !complete(rightData)) return NextResponse.json({ comparable: false, missing: [!complete(leftData) ? from : null, !complete(rightData) ? to : null].filter(Boolean), reason: "Both exact versions must complete Deep Scan before a comparison can be generated.", ...summaries }, { headers });
  return NextResponse.json({ comparable: true, extension_id: extensionId, attribution: evidenceAttribution(leftData, rightData), ...summaries, changes: compareScanEvidence(leftData, rightData) }, { headers });
}

function evidence(product: Record<string, unknown> | null): ScanEvidence {
  return { scan: product?.scan as EvidenceRow | null || null, findings: (product?.findings || []) as EvidenceRow[], files: (product?.files || []) as EvidenceRow[], dependencies: (product?.dependencies || []) as EvidenceRow[] };
}
