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

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
