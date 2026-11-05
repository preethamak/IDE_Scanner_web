import { NextResponse } from "next/server";
import { requestScanEvidence } from "@/lib/requestScanEvidence";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string; version: string }> }) {
  const { id, version } = await context.params;
  const read = await requestScanEvidence(request);
  const product = await read(decodeURIComponent(id), decodeURIComponent(version), new URL(request.url).searchParams.get("scanId") || undefined);
  const scan = product?.scan as Record<string, unknown> | null | undefined;
  if (!product || !scan || String(scan.analysis_status || "complete") !== "complete") return NextResponse.json({ error: "No completed report is available to you for this exact version and scan." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  const payload = {
    schema_version: "guardrails-evidence-export-v1",
    identity: pick(scan, ["id", "extension_id", "version", "artifact_sha256", "scanned_at", "scanner_build", "ruleset_version", "policy_version", "score_schema_version"]),
    outcome: pick(scan, ["decision", "public_outcome", "decision_basis", "severity", "decision_reason", "evidence_confidence", "provenance_tier", "coverage_percent", "analysis_status"]),
    findings: product.findings,
    capabilities: scan.capabilities || {},
    dependencies: product.dependencies,
  };
  const fileName = `guardrails-${safePart(id)}-${safePart(version)}-evidence.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "private, max-age=0, no-store" } });
}

function pick(source: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? null]));
}

function safePart(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120);
}
