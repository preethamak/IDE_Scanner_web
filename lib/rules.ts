import { publicRuntimeError } from "@/lib/publicRuntimeContract";

export type RuleReference = {
  id: string;
  title: string;
  category: string;
  evidence: string;
  severity: string;
  engine: string;
  description: string;
  recommendation: string;
  decisionEffect: string;
  confidenceBasis: string;
  falsePositiveNotes: string;
};

export type ActiveRuleCatalog = {
  policyVersion: string;
  rulesetVersion: string;
  scoreSchemaVersion: string;
  scannerBuild: string;
  rules: RuleReference[];
};

export type RuleCatalogIdentity = Pick<ActiveRuleCatalog, "policyVersion" | "rulesetVersion">;

export function normalizeRuleCatalog(value: unknown): RuleReference[] {
  if (!Array.isArray(value)) return [];
  const rules: RuleReference[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rule = item as Record<string, unknown>;
    const id = text(rule.rule_id);
    const title = text(rule.title);
    if (!id || !title) continue;
    rules.push({
      id,
      title,
      category: text(rule.category, "uncategorized"),
      evidence: text(rule.evidence_class, "unknown"),
      severity: text(rule.default_severity, "INFO"),
      engine: text(rule.engine, "unknown"),
      description: text(rule.description),
      recommendation: text(rule.recommendation),
      decisionEffect: text(rule.decision_effect),
      confidenceBasis: text(rule.confidence_basis),
      falsePositiveNotes: text(rule.false_positive_notes),
    });
  }
  return rules.sort((left, right) => left.id.localeCompare(right.id));
}

/** Return a catalog only when the report explicitly identifies the active rule release. */
export function catalogFromReleaseReport(report: unknown, identity: RuleCatalogIdentity): RuleReference[] | null {
  const value = objectValue(report);
  const catalog = objectValue(value.rules);
  if (
    text(catalog.policy_version) !== identity.policyVersion
    || text(catalog.ruleset_version) !== identity.rulesetVersion
  ) return null;
  const rules = normalizeRuleCatalog(catalog.rules);
  return rules.length ? rules : null;
}

/**
 * Public rule metadata must come from the same complete, runtime-aware report
 * contract on both publication backends. Keeping this check beside the
 * catalog parser prevents a Supabase-only path from exposing rules from a
 * report that Cloudflare would reject.
 */
export function hasCompletePublicCoverage(report: unknown): boolean {
  const value = objectValue(report);
  const detail = singleExtensionDetail(value.extensions);
  if (!detail || text(detail.analysis_status) !== "complete") return false;
  const coverage = objectValue(detail.analysis_coverage);
  return coverage.status === "complete"
    && coverage.required_providers_complete === true
    && publicRuntimeError(objectValue(value.metadata), coverage) === null;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function singleExtensionDetail(value: unknown): Record<string, unknown> | null {
  const entries = Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : Object.values(objectValue(value)).filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  return entries.length === 1 ? entries[0] : null;
}
