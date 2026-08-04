import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";
import { compareScanEvidence, evidenceAttribution, summarizeScan, type EvidenceRow, type ScanEvidence } from "@/lib/extensionComparison";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  if (!from || !to || from === to) return NextResponse.json({ error: "Two different versions are required." }, { status: 400 });
  const db = publicDb();
  if (!db) return NextResponse.json({ error: "Comparison is temporarily unavailable." }, { status: 503 });
  const extensionId = decodeURIComponent(id);
  const { data: versions, error } = await db.from("extension_versions").select("version,latest_scan_id,published_at").eq("extension_id", extensionId).in("version", [from, to]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const byVersion = new Map((versions || []).map((item) => [String(item.version), item]));
  const left = byVersion.get(from); const right = byVersion.get(to);
  if (!left?.latest_scan_id || !right?.latest_scan_id) return NextResponse.json({ comparable: false, missing: [!left?.latest_scan_id ? from : null, !right?.latest_scan_id ? to : null].filter(Boolean), reason: "Both exact versions must complete Deep Scan before a comparison can be generated." });
  const [leftData, rightData] = await Promise.all([load(String(left.latest_scan_id)), load(String(right.latest_scan_id))]);
  if (!leftData.scan || !rightData.scan) return NextResponse.json({ comparable: false, missing: [!leftData.scan ? from : null, !rightData.scan ? to : null].filter(Boolean), reason: "Normalized scan evidence is missing for one or both versions." });
  return NextResponse.json({ comparable: true, extension_id: extensionId, attribution: evidenceAttribution(leftData, rightData), from: summarizeScan(from, leftData), to: summarizeScan(to, rightData), changes: compareScanEvidence(leftData, rightData) });

  async function load(scanId: string) {
    const [scan, findings, files, dependencies] = await Promise.all([
      db!.from("scans").select("id,decision,decision_reason,severity,coverage_percent,capabilities,artifact_sha256,scanned_at,scanner_build,ruleset_version,schema_version").eq("id", scanId).maybeSingle(),
      db!.from("findings").select("rule_id,severity,summary,actionability,evidence_class,file_refs").eq("scan_id", scanId),
      db!.from("artifact_files").select("path,sha256,size_bytes,kind").eq("scan_id", scanId).limit(5000),
      db!.from("dependencies").select("name,version,relationship,advisories").eq("scan_id", scanId).limit(5000),
    ]);
    return { scan: scan.data as EvidenceRow | null, findings: (findings.data || []) as EvidenceRow[], files: (files.data || []) as EvidenceRow[], dependencies: (dependencies.data || []) as EvidenceRow[] } satisfies ScanEvidence;
  }
}
