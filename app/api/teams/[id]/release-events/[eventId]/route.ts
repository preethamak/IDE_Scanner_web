import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { asUuid, requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { compareScanEvidence, evidenceAttribution, summarizeScan, type EvidenceRow, type ScanEvidence } from "@/lib/extensionComparison";

export async function GET(request: Request, context: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { user } = await authenticated(request); const { id, eventId } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    if (!asUuid(eventId)) return NextResponse.json({ error: "A valid release event id is required." }, { status: 400 });
    const db = serviceDb();
    const { data, error } = await db.from("team_release_events").select("id,team_id,extension_id,baseline_scan_id,target_scan_id,baseline_version,target_version,state,materiality,error,created_at,updated_at").eq("id", eventId).eq("team_id", id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Release event not found." }, { status: 404 });
    const comparisonAvailable = data.state === "comparison_ready" && Boolean(data.baseline_scan_id && data.target_scan_id);
    if (!comparisonAvailable) return NextResponse.json({ event: data, comparison_available: false });
    const [baseline, target] = await Promise.all([loadEvidence(db, data.baseline_scan_id!), loadEvidence(db, data.target_scan_id!)]);
    if (!baseline.scan || !target.scan) return NextResponse.json({ event: data, comparison_available: false, comparison_error: "Normalized immutable scan evidence is missing." });
    return NextResponse.json({ event: data, comparison_available: true, attribution: evidenceAttribution(baseline, target), from: summarizeScan(data.baseline_version || "baseline", baseline), to: summarizeScan(data.target_version, target), changes: compareScanEvidence(baseline, target) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Release event lookup failed." }, { status: 403 }); }
}

async function loadEvidence(db: ReturnType<typeof serviceDb>, scanId: string): Promise<ScanEvidence> {
  const [scan, findings, files, dependencies] = await Promise.all([
    db.from("scans").select("id,decision,decision_reason,severity,coverage_percent,capabilities,artifact_sha256,scanned_at,scanner_build,ruleset_version,schema_version").eq("id", scanId).maybeSingle(),
    db.from("findings").select("rule_id,severity,summary,actionability,evidence_class,file_refs").eq("scan_id", scanId),
    db.from("artifact_files").select("path,sha256,size_bytes,kind").eq("scan_id", scanId).limit(5000),
    db.from("dependencies").select("name,version,relationship,advisories").eq("scan_id", scanId).limit(5000),
  ]);
  if (scan.error) throw scan.error;
  if (findings.error) throw findings.error;
  if (files.error) throw files.error;
  if (dependencies.error) throw dependencies.error;
  return { scan: scan.data as EvidenceRow | null, findings: (findings.data || []) as EvidenceRow[], files: (files.data || []) as EvidenceRow[], dependencies: (dependencies.data || []) as EvidenceRow[] };
}
