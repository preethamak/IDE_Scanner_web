import { NextResponse } from "next/server";
import { publicDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";
type Row = Record<string, unknown>;

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
  return NextResponse.json({ comparable: true, extension_id: extensionId, from: summarize(from, leftData), to: summarize(to, rightData), changes: compare(leftData, rightData) });

  async function load(scanId: string) {
    const [scan, findings, files, dependencies] = await Promise.all([
      db!.from("scans").select("id,decision,decision_reason,severity,coverage_percent,capabilities,artifact_sha256,scanned_at").eq("id", scanId).maybeSingle(),
      db!.from("findings").select("rule_id,severity,summary,actionability,evidence_class,file_refs").eq("scan_id", scanId),
      db!.from("artifact_files").select("path,sha256,size_bytes,kind").eq("scan_id", scanId).limit(5000),
      db!.from("dependencies").select("name,version,relationship,advisories").eq("scan_id", scanId).limit(5000),
    ]);
    return { scan: scan.data as Row | null, findings: (findings.data || []) as Row[], files: (files.data || []) as Row[], dependencies: (dependencies.data || []) as Row[] };
  }
}

function summarize(version: string, data: ReturnTypeData) { return { version, decision: data.scan?.decision, severity: data.scan?.severity, coverage_percent: data.scan?.coverage_percent, artifact_sha256: data.scan?.artifact_sha256, scanned_at: data.scan?.scanned_at, findings: uniqueRules(data.findings).size, files: data.files.length, dependencies: data.dependencies.length, capabilities: Object.keys((data.scan?.capabilities || {}) as Row).length }; }
type ReturnTypeData = { scan: Row | null; findings: Row[]; files: Row[]; dependencies: Row[] };
function uniqueRules(items: Row[]) { return new Map(items.map((item) => [String(item.rule_id), item])); }
function compare(left: ReturnTypeData, right: ReturnTypeData) {
  const leftFindings = uniqueRules(left.findings); const rightFindings = uniqueRules(right.findings);
  const leftFiles = new Map(left.files.map((item) => [String(item.path), item])); const rightFiles = new Map(right.files.map((item) => [String(item.path), item]));
  const depKey = (item: Row) => `${item.name}@${item.version}`; const leftDeps = new Map(left.dependencies.map((item) => [depKey(item), item])); const rightDeps = new Map(right.dependencies.map((item) => [depKey(item), item]));
  const leftCaps = new Set(Object.keys((left.scan?.capabilities || {}) as Row)); const rightCaps = new Set(Object.keys((right.scan?.capabilities || {}) as Row));
  return {
    outcome: { decision: changed(left.scan?.decision, right.scan?.decision), severity: changed(left.scan?.severity, right.scan?.severity), coverage: changed(left.scan?.coverage_percent, right.scan?.coverage_percent) },
    findings: { added: added(leftFindings, rightFindings, findingView), removed: added(rightFindings, leftFindings, findingView) },
    capabilities: { added: [...rightCaps].filter((key) => !leftCaps.has(key)), removed: [...leftCaps].filter((key) => !rightCaps.has(key)) },
    dependencies: { added: added(leftDeps, rightDeps, dependencyView), removed: added(rightDeps, leftDeps, dependencyView) },
    files: { added: added(leftFiles, rightFiles, fileView), removed: added(rightFiles, leftFiles, fileView), changed: [...rightFiles.entries()].filter(([path, item]) => leftFiles.has(path) && leftFiles.get(path)?.sha256 !== item.sha256).slice(0, 200).map(([, item]) => fileView(item)) },
  };
}
function changed(from: unknown, to: unknown) { return { from, to, changed: from !== to }; }
function added(mapA: Map<string, Row>, mapB: Map<string, Row>, view: (row: Row) => Row) { return [...mapB.entries()].filter(([key]) => !mapA.has(key)).slice(0, 200).map(([, item]) => view(item)); }
function findingView(item: Row) { return { rule_id: item.rule_id, severity: item.severity, summary: item.summary, actionability: item.actionability, evidence_class: item.evidence_class }; }
function dependencyView(item: Row) { return { name: item.name, version: item.version, relationship: item.relationship, advisory_count: Array.isArray(item.advisories) ? item.advisories.length : 0 }; }
function fileView(item: Row) { return { path: item.path, sha256: item.sha256, size_bytes: item.size_bytes, kind: item.kind }; }
