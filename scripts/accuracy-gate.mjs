export const ACCURACY_GATE_SCHEMA_VERSION = "1.0";
export const MIN_FRESH_HOLDOUT_SAFE = 5;
export const MIN_FRESH_HOLDOUT_MALICIOUS = 5;
export const MAX_SAFE_REVIEW_RATE = 0.2;
const SHA256 = /^[0-9a-f]{64}$/i;
// A known-safe label means "not malware"; it does not mean "no security
// issue." Exact dependency advisories are legitimate review evidence and
// must not be treated as scanner noise merely because the artifact is not a
// malicious fixture.
const ALLOWED_KNOWN_SAFE_ACTIONABLE_RULES = new Set(["vulnerable-npm-dependency"]);

export function validateAccuracyGate(value, expected = {}) {
  const errors = [];
  const gate = object(value);
  const identity = object(gate.report_identity);
  const checks = object(gate.gate)?.checks;
  const summary = object(gate.summary);
  const holdout = object(gate.holdout);
  const behaviorOnly = object(holdout.behavior_only);
  const runtimeEvidence = object(holdout.runtime_evidence);
  const ruleNoise = object(holdout.rule_noise);

  if (String(gate.schema_version || "") !== ACCURACY_GATE_SCHEMA_VERSION) {
    errors.push(`accuracy gate schema must be ${ACCURACY_GATE_SCHEMA_VERSION}`);
  }
  if (!String(gate.corpus_id || "").trim() || !String(gate.corpus_version || "").trim()) {
    errors.push("accuracy gate must identify a versioned labelled corpus");
  }
  if (object(gate.gate).passed !== true) errors.push("accuracy gate did not pass");
  const requiredChecks = ["required_pass_rate", "safe_block_rate", "safe_review_rate", "malicious_allow_rate", "incomplete_required"];
  if (!checks || requiredChecks.some((key) => checks[key] !== true) || Object.values(checks).some((value) => value !== true)) {
    errors.push("accuracy gate contains a failed or missing check");
  }

  for (const [field, expectedValue] of Object.entries(expected)) {
    if (expectedValue === undefined || expectedValue === null || expectedValue === "") continue;
    if (String(identity[field] || "") !== String(expectedValue)) {
      errors.push(`accuracy gate ${field} does not match the publication identity`);
    }
  }

  const requiredArtifacts = number(summary.required_artifacts);
  const requiredPassed = number(summary.required_passed);
  const requiredFailed = number(summary.required_failed);
  const incompleteRequired = number(summary.incomplete_required);
  const safeEvaluated = number(summary.safe_evaluated);
  const maliciousEvaluated = number(summary.malicious_evaluated);
  for (const field of ["required_pass_rate", "safe_block_rate", "safe_review_rate", "malicious_allow_rate"]) {
    if (!boundedRate(summary[field])) errors.push(`accuracy gate summary ${field} must be a number between 0 and 1`);
  }
  if (requiredArtifacts < 1 || requiredPassed !== requiredArtifacts || requiredFailed !== 0 || incompleteRequired !== 0) {
    errors.push("accuracy gate has incomplete required corpus coverage");
  }
  if (safeEvaluated < 1 || maliciousEvaluated < 1) {
    errors.push("accuracy gate must evaluate both known-safe and known-malicious fixtures");
  }
  if (number(summary.required_pass_rate) < 1) errors.push("accuracy gate required pass rate is below 100 percent");
  if (number(summary.safe_block_rate) > 0) errors.push("accuracy gate has known-safe blocks");
  if (number(summary.safe_review_rate) > MAX_SAFE_REVIEW_RATE) {
    errors.push(`accuracy gate safe review rate exceeds the ${MAX_SAFE_REVIEW_RATE * 100}% noise ceiling`);
  }
  if (number(summary.malicious_allow_rate) > 0) errors.push("accuracy gate allows known-malicious fixtures");
  if (holdout.status !== "fresh-labeled" || holdout.complete !== true) {
    errors.push("publication requires a complete fresh-labeled holdout gate in addition to regression fixtures");
  }
  if (number(holdout.safe_evaluated) < MIN_FRESH_HOLDOUT_SAFE || number(holdout.malicious_evaluated) < MIN_FRESH_HOLDOUT_MALICIOUS) {
    errors.push(`fresh-labeled holdout must include at least ${MIN_FRESH_HOLDOUT_SAFE} known-safe and ${MIN_FRESH_HOLDOUT_MALICIOUS} known-malicious exact artifacts`);
  }
  const holdoutArtifacts = number(holdout.artifact_count);
  const holdoutEvaluated = number(holdout.safe_evaluated) + number(holdout.malicious_evaluated);
  if (holdoutArtifacts < 2 || holdoutEvaluated !== holdoutArtifacts) {
    errors.push("fresh-labeled holdout has incomplete exact-artifact coverage");
  }
  if (number(holdout.required_pass_rate) < 1) {
    errors.push("fresh-labeled holdout required pass rate is below 100 percent");
  }
  if (number(holdout.dynamic_required) < 1 || number(holdout.dynamic_not_applicable) < 1) {
    errors.push("fresh-labeled holdout must include both executable-capability and explicit runtime-not-applicable artifacts");
  }
  for (const field of ["required_pass_rate", "safe_block_rate", "malicious_allow_rate", "safe_review_rate", "malicious_detection_rate"]) {
    if (!boundedRate(holdout[field])) errors.push(`fresh-labeled holdout ${field} must be a number between 0 and 1`);
  }
  if (number(holdout.safe_block_rate) > 0) {
    errors.push("fresh-labeled holdout has known-safe blocks");
  }
  if (number(holdout.safe_review_rate) > MAX_SAFE_REVIEW_RATE) {
    errors.push(`fresh-labeled holdout safe review rate exceeds the ${MAX_SAFE_REVIEW_RATE * 100}% noise ceiling`);
  }
  if (number(holdout.malicious_allow_rate) > 0) {
    errors.push("fresh-labeled holdout allows known-malicious fixtures");
  }
  if (!holdout.rule_matrix || typeof holdout.rule_matrix !== "object" || Array.isArray(holdout.rule_matrix)) {
    errors.push("fresh-labeled holdout must retain a labelled rule matrix");
  } else {
    const ruleRows = Object.entries(holdout.rule_matrix);
    if (!ruleRows.length) {
      errors.push("fresh-labeled holdout must retain at least one labelled rule firing");
    }
    for (const [ruleId, counts] of ruleRows) {
      if (!ruleId.trim() || !counts || typeof counts !== "object" || Array.isArray(counts)) {
        errors.push("fresh-labeled holdout rule matrix contains an invalid rule row");
        continue;
      }
      for (const label of ["known_safe", "known_malicious"]) {
        const key = `fired_on_${label}`;
        const value = counts[key];
        if (!Number.isInteger(value) || value < 0) {
          errors.push(`fresh-labeled holdout rule matrix has an invalid ${label} count`);
        } else if (value > number(holdout[`${label === "known_safe" ? "safe" : "malicious"}_evaluated`])) {
          errors.push(`fresh-labeled holdout rule matrix overcounts ${label} artifacts`);
        }
      }
      if (Object.keys(counts).some((key) => !["fired_on_known_safe", "fired_on_known_malicious"].includes(key))) {
        errors.push("fresh-labeled holdout rule matrix contains unexpected fields");
      }
    }
  }
  const labelCounts = object(holdout.label_counts);
  if (number(labelCounts.known_safe) !== number(holdout.safe_evaluated)
    || number(labelCounts.known_malicious) !== number(holdout.malicious_evaluated)) {
    errors.push("fresh-labeled holdout label counts do not match the frozen corpus");
  }
  if (ruleNoise.schema_version !== "guardrails.report-audit.v1") {
    errors.push("fresh-labeled holdout must retain a labelled rule-noise audit");
  }
  if (!/^[0-9a-f]{64}$/i.test(String(ruleNoise.audit_sha256 || ""))) {
    errors.push("fresh-labeled holdout rule-noise audit requires an audit SHA-256");
  }
  if (String(ruleNoise.scanner_build || "") !== String(identity.scanner_build || "")) {
    errors.push("fresh-labeled holdout rule-noise audit build does not match the report identity");
  }
  if (String(ruleNoise.source_scan_id || "").trim() === "") {
    errors.push("fresh-labeled holdout rule-noise audit requires a source scan id");
  }
  if (number(ruleNoise.labeled_extensions) !== holdoutArtifacts
    || number(object(ruleNoise.label_counts).known_safe) !== number(holdout.safe_evaluated)
    || number(object(ruleNoise.label_counts).known_malicious) !== number(holdout.malicious_evaluated)) {
    errors.push("fresh-labeled holdout rule-noise audit coverage does not match the holdout");
  }
  for (const field of ["false_positive_review_count", "false_positive_block_count", "false_negative_malware_count"]) {
    if (!Number.isInteger(ruleNoise[field]) || ruleNoise[field] < 0) {
      errors.push(`fresh-labeled holdout rule-noise audit ${field} must be a non-negative integer`);
    }
  }
  if (!boundedRate(ruleNoise.safe_review_rate)) {
    errors.push("fresh-labeled holdout rule-noise audit safe_review_rate must be a number between 0 and 1");
  } else if (ruleNoise.safe_review_rate > MAX_SAFE_REVIEW_RATE) {
    errors.push("fresh-labeled holdout rule-noise audit safe review rate exceeds the 20% noise ceiling");
  }
  if (ruleNoise.false_positive_block_count !== 0) {
    errors.push("fresh-labeled holdout rule-noise audit contains a known-safe block");
  }
  if (ruleNoise.false_negative_malware_count !== 0) {
    errors.push("fresh-labeled holdout rule-noise audit contains a known-malicious false negative");
  }
  const knownSafeActionable = ruleNoise.rules_with_known_safe_actionable;
  if (!Array.isArray(knownSafeActionable)) {
    errors.push("fresh-labeled holdout rule-noise audit contains invalid known-safe actionable rule data");
  } else {
    const unexpected = knownSafeActionable
      .map((rule) => String(rule))
      .filter((rule) => !ALLOWED_KNOWN_SAFE_ACTIONABLE_RULES.has(rule));
    if (unexpected.length) {
      errors.push(`fresh-labeled holdout rule-noise audit contains unexpected known-safe actionable rules: ${unexpected.join(", ")}`);
    }
  }
  if (!Array.isArray(ruleNoise.rules_with_known_safe_blocks)
    || ruleNoise.rules_with_known_safe_blocks.length) {
    errors.push("fresh-labeled holdout rule-noise audit contains known-safe blocking rules");
  }
  const provenance = object(holdout.provenance);
  for (const field of ["source_sha256", "advisory_snapshot_sha256"]) {
    if (!/^[0-9a-f]{64}$/i.test(String(provenance[field] || ""))) {
      errors.push(`fresh-labeled holdout provenance requires ${field}`);
    }
  }
  if (!String(provenance.advisory_snapshot_version || "").trim()) {
    errors.push("fresh-labeled holdout provenance requires advisory_snapshot_version");
  }
  if (number(provenance.malicious_artifacts_with_exact_advisories) !== number(holdout.malicious_evaluated)) {
    errors.push("fresh-labeled holdout provenance must tie every malicious label to an exact advisory");
  }
  if (runtimeEvidence.required !== true
    || runtimeEvidence.runtime_enabled !== true
    || String(runtimeEvidence.profile || "") !== "deep"
    || runtimeEvidence.external_syscall_trace !== true) {
    errors.push("fresh-labeled holdout must prove a required deep runtime scan with external syscall tracing");
  }
  for (const field of ["scanner_build", "policy_version", "ruleset_version"]) {
    if (holdout[field] && String(holdout[field]) !== String(identity[field] || "")) {
      errors.push(`fresh-labeled holdout ${field} does not match the report identity`);
    }
  }

  if (behaviorOnly.status !== "behavior-only" || behaviorOnly.complete !== true) {
    errors.push("publication requires a complete behavior-only shadow holdout");
  }
  for (const field of ["required_pass_rate", "safe_block_rate", "safe_review_rate", "malicious_allow_rate", "malicious_detection_rate"]) {
    if (!boundedRate(behaviorOnly[field])) errors.push(`behavior-only holdout ${field} must be a number between 0 and 1`);
  }
  if (number(behaviorOnly.required_pass_rate) < 1) errors.push("behavior-only holdout required pass rate is below 100 percent");
  if (number(behaviorOnly.safe_block_rate) > 0) errors.push("behavior-only holdout has known-safe blocks");
  if (number(behaviorOnly.safe_review_rate) > MAX_SAFE_REVIEW_RATE) errors.push("behavior-only holdout safe review rate exceeds the 20% noise ceiling");
  if (number(behaviorOnly.malicious_allow_rate) > 0) errors.push("behavior-only holdout allows known-malicious fixtures");
  if (number(behaviorOnly.malicious_detection_rate) < 1) errors.push("behavior-only holdout misses a known-malicious artifact");
  if (number(behaviorOnly.safe_evaluated) !== number(holdout.safe_evaluated)
    || number(behaviorOnly.malicious_evaluated) !== number(holdout.malicious_evaluated)) {
    errors.push("behavior-only holdout label counts do not match the primary holdout");
  }
  if (number(behaviorOnly.dynamic_required) < 1 || number(behaviorOnly.dynamic_not_applicable) < 1) {
    errors.push("behavior-only holdout must include both executable-capability and runtime-not-applicable artifacts");
  }
  const behaviorRuntime = object(behaviorOnly.runtime_evidence);
  if (behaviorRuntime.required !== true
    || behaviorRuntime.runtime_enabled !== true
    || String(behaviorRuntime.profile || "") !== "deep"
    || behaviorRuntime.external_syscall_trace !== true) {
    errors.push("behavior-only holdout must prove a required deep runtime scan with external syscall tracing");
  }
  const behaviorSnapshot = object(behaviorOnly.advisory_snapshot);
  if (behaviorSnapshot.status !== "completed"
    || behaviorSnapshot.entry_count !== 0
    || !SHA256.test(String(behaviorSnapshot.sha256 || ""))) {
    errors.push("behavior-only holdout must prove a completed empty advisory snapshot");
  }
  for (const field of ["scanner_build", "policy_version", "ruleset_version"]) {
    if (behaviorOnly[field] && String(behaviorOnly[field]) !== String(identity[field] || "")) {
      errors.push(`behavior-only holdout ${field} does not match the report identity`);
    }
  }
  if (!behaviorOnly.rule_matrix || typeof behaviorOnly.rule_matrix !== "object" || Array.isArray(behaviorOnly.rule_matrix) || !Object.keys(behaviorOnly.rule_matrix).length) {
    errors.push("behavior-only holdout must retain a labelled rule matrix");
  }

  return errors;
}

export function assertAccuracyGate(value, expected = {}) {
  const errors = validateAccuracyGate(value, expected);
  if (errors.length) throw new Error(`Accuracy gate rejected publication:\n- ${errors.join("\n- ")}`);
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : -1;
}

function boundedRate(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}
