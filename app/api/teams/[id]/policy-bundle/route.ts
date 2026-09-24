import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { privateDb } from "@/lib/cloudflarePrivate";
import { getWorkspaceState } from "@/lib/cloudflareWorkspace";
import { serviceDb } from "@/lib/supabase";
import { buildExtensionPolicyBundle, type ExtensionPolicyDecisionRow } from "@/lib/extensionPolicy";
import { requireTeamRole } from "@/lib/teams";
import { teamApiError } from "@/lib/teamApiError";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user, provider } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);

    const decisions = provider === "cloudflare"
      ? await cloudflareDecisions(id)
      : await supabaseDecisions(id);
    const bundle = buildExtensionPolicyBundle(id, decisions);
    const format = new URL(request.url).searchParams.get("format") || "guardrails";
    if (format === "vscode") {
      return new Response(
        `${JSON.stringify(bundle.enforcement.vscode.settings, null, 2)}\n`,
        { headers: downloadHeaders("guardrails-vscode-settings.json", "application/json") },
      );
    }
    if (format !== "guardrails") {
      return NextResponse.json({ error: "format must be guardrails or vscode." }, { status: 400 });
    }
    return new Response(`${JSON.stringify(bundle, null, 2)}\n`, {
      headers: downloadHeaders("guardrails-enterprise-policy.json", "application/json"),
    });
  } catch (error) {
    const failure = teamApiError(error, "Enterprise policy export is temporarily unavailable.");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

async function cloudflareDecisions(teamId: string): Promise<ExtensionPolicyDecisionRow[]> {
  const state = await getWorkspaceState(teamId);
  const scanIds = [...new Set(state.decisions.map((decision) => String(decision.scan_id || "")).filter(Boolean))];
  const reports = new Map<string, Record<string, unknown>>();
  // D1 has a bound-parameter limit, so keep each lookup small and avoid an
  // N+1 query storm when a team has a long decision history.
  for (let index = 0; index < scanIds.length; index += 50) {
    const chunk = scanIds.slice(index, index + 50);
    const placeholders = chunk.map(() => "?").join(",");
    const result = await privateDb().prepare(
      `SELECT scan_id,extension_id,version,artifact_sha256,report_json,created_at
       FROM app_scan_reports WHERE scan_id IN (${placeholders})`,
    ).bind(...chunk).all<Record<string, unknown>>();
    for (const report of result.results || []) {
      const scanId = String(report.scan_id || "");
      if (scanId) reports.set(scanId, report);
    }
  }
  return state.decisions.map((decision) => {
    const report = reports.get(String(decision.scan_id || "")) || null;
    const extensionId = String(decision.extension_id || "");
    const version = String(decision.version || "");
    const exactReport = report && sameRelease(report, extensionId, version) ? report : null;
    return {
      ...decision,
      ...(exactReport || {}),
      artifact_identity_match: Boolean(exactReport),
      ...cloudflareReportFields(exactReport, extensionId, version),
    } as ExtensionPolicyDecisionRow;
  });
}

async function supabaseDecisions(teamId: string): Promise<ExtensionPolicyDecisionRow[]> {
  const db = serviceDb();
  const pageSize = 1000;
  const decisions: Array<Record<string, unknown>> = [];
  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const decisionResult = await db
      .from("team_decisions")
      .select("id,scan_id,extension_id,version,decision,rationale,updated_at")
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (decisionResult.error) throw decisionResult.error;
    const page = decisionResult.data || [];
    decisions.push(...page);
    if (page.length < pageSize) break;
    if (offset + pageSize >= 100_000) throw new Error("Enterprise policy contains more than 100,000 decisions; export was refused to avoid truncation.");
  }
  const scanIds = [...new Set(decisions.map((row) => String(row.scan_id || "")).filter(Boolean))];
  if (!scanIds.length) return decisions as ExtensionPolicyDecisionRow[];
  const scans = new Map<string, Record<string, unknown>>();
  for (let offset = 0; offset < scanIds.length; offset += 500) {
    const scanResult = await db
      .from("scans")
      .select("id,extension_id,version,artifact_sha256,scanner_build,policy_version,score_schema_version,analysis_status,coverage_percent,risk_score,malware_score,public_outcome,capabilities,capability_assessment")
      .in("id", scanIds.slice(offset, offset + 500));
    if (scanResult.error) throw scanResult.error;
    for (const row of scanResult.data || []) scans.set(String(row.id), row);
  }
  return decisions.map((row) => {
    const scan = scans.get(String(row.scan_id || "")) || null;
    const exact = scan && sameRelease(scan, String(row.extension_id || ""), String(row.version || "")) ? scan : null;
    return {
      ...row,
      ...(exact || {}),
      artifact_identity_match: Boolean(exact),
    };
  }) as ExtensionPolicyDecisionRow[];
}

function downloadHeaders(filename: string, contentType: string): HeadersInit {
  return {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store",
    "X-GuardRails-Export": "enterprise-policy-v1",
  };
}

function sameRelease(row: Record<string, unknown>, extensionId: string, version: string): boolean {
  return String(row.extension_id || "").toLowerCase() === extensionId.toLowerCase()
    && String(row.version || "") === version;
}

function cloudflareReportFields(
  row: Record<string, unknown> | null,
  extensionId: string,
  version: string,
): Record<string, unknown> {
  if (!row?.report_json) return {};
  let bundle: Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(row.report_json));
    bundle = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
  const metadata = objectValue(bundle.metadata);
  const extensions = bundle.extensions;
  const candidates = Array.isArray(extensions)
    ? extensions
    : extensions && typeof extensions === "object"
      ? Object.values(extensions)
      : [];
  const detail = candidates.find((item) => item && typeof item === "object" && !Array.isArray(item)
    && sameRelease(item as Record<string, unknown>, extensionId, version)) as Record<string, unknown> | undefined;
  if (!detail) return {};
  const coverage = objectValue(detail.analysis_coverage);
  return {
    scanner_build: String(metadata.scanner_build || detail.scanner_build || "unknown"),
    policy_version: String(metadata.policy_version || detail.policy_version || "unknown"),
    score_schema_version: String(detail.score_schema_version || metadata.score_schema_version || "unknown"),
    analysis_status: String(detail.analysis_status || "unknown"),
    coverage_percent: numberValue(coverage.coverage_percent),
    risk_score: numberValue(detail.risk_score),
    malware_score: numberValue(detail.malware_score),
    trust_tier: String(detail.trust_tier || ""),
    public_outcome: String(detail.public_outcome || ""),
    capabilities: detail.capabilities,
    capability_assessment: detail.capability_assessment,
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
