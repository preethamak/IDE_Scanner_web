export type EvidenceRow = Record<string, unknown>;
export type ScanEvidence = { scan: EvidenceRow | null; findings: EvidenceRow[]; files: EvidenceRow[]; dependencies: EvidenceRow[] };

export function summarizeScan(version: string, data: ScanEvidence) {
  return {
    version,
    scan_id: data.scan?.id,
    analysis_status: data.scan?.analysis_status,
    decision: data.scan?.decision,
    severity: data.scan?.severity,
    coverage_percent: data.scan?.coverage_percent,
    artifact_sha256: data.scan?.artifact_sha256,
    scanned_at: data.scan?.scanned_at,
    scanner_build: data.scan?.scanner_build,
    ruleset_version: data.scan?.ruleset_version,
    findings: data.scan ? uniqueRules(data.findings).size : null,
    files: data.scan ? data.files.length : null,
    dependencies: data.scan ? data.dependencies.length : null,
    capabilities: data.scan ? Object.keys((data.scan.capabilities || {}) as EvidenceRow).length : null,
  };
}

export function compareScanEvidence(left: ScanEvidence, right: ScanEvidence) {
  const leftFindings = uniqueRules(left.findings); const rightFindings = uniqueRules(right.findings);
  const leftFiles = new Map(left.files.map((item) => [String(item.path), item])); const rightFiles = new Map(right.files.map((item) => [String(item.path), item]));
  const depKey = (item: EvidenceRow) => `${item.name}@${item.version}`; const leftDeps = new Map(left.dependencies.map((item) => [depKey(item), item])); const rightDeps = new Map(right.dependencies.map((item) => [depKey(item), item]));
  const leftCaps = new Set(Object.keys((left.scan?.capabilities || {}) as EvidenceRow)); const rightCaps = new Set(Object.keys((right.scan?.capabilities || {}) as EvidenceRow));
  const changedFiles = [...rightFiles.entries()].filter(([path, item]) => leftFiles.has(path) && leftFiles.get(path)?.sha256 !== item.sha256);
  return {
    outcome: { decision: changed(left.scan?.decision, right.scan?.decision), severity: changed(left.scan?.severity, right.scan?.severity), coverage: changed(left.scan?.coverage_percent, right.scan?.coverage_percent) },
    findings: { ...mapDelta(leftFindings, rightFindings, findingView) },
    capabilities: { added: [...rightCaps].filter((key) => !leftCaps.has(key)), removed: [...leftCaps].filter((key) => !rightCaps.has(key)) },
    dependencies: { ...mapDelta(leftDeps, rightDeps, dependencyView) },
    files: { ...mapDelta(leftFiles, rightFiles, fileView), changed: changedFiles.slice(0, 200).map(([, item]) => fileView(item)), total_changed: changedFiles.length },
  };
}

export function evidenceAttribution(left: ScanEvidence, right: ScanEvidence) {
  const known = (value: unknown) => typeof value === "string" && value.trim().length > 0 && !["unknown", "unavailable", "none", "n/a", "null", "undefined"].includes(value.trim().toLowerCase());
  const provenanceKnown = [left.scan?.scanner_build, right.scan?.scanner_build, left.scan?.ruleset_version, right.scan?.ruleset_version].every(known);
  const sameScannerBuild = known(left.scan?.scanner_build) && known(right.scan?.scanner_build) && left.scan?.scanner_build === right.scan?.scanner_build;
  const sameRuleset = known(left.scan?.ruleset_version) && known(right.scan?.ruleset_version) && left.scan?.ruleset_version === right.scan?.ruleset_version;
  return { artifact_changes: true, provenance_known: provenanceKnown, evidence_changes: sameScannerBuild && sameRuleset, same_scanner_build: sameScannerBuild, same_ruleset: sameRuleset, note: sameScannerBuild && sameRuleset ? "Both versions were analyzed by the same scanner build and ruleset." : !provenanceKnown ? "Scanner build or ruleset provenance is missing. File and dependency deltas are exact; finding and capability differences cannot be attributed to the release." : "File and dependency deltas are exact. Finding and capability deltas may also reflect scanner or ruleset changes, so they are not attributed to the release." };
}

function uniqueRules(items: EvidenceRow[]) { return new Map(items.map((item) => [String(item.rule_id), item])); }
function changed(from: unknown, to: unknown) { return { from, to, changed: from !== to }; }
function added(mapA: Map<string, EvidenceRow>, mapB: Map<string, EvidenceRow>, view: (row: EvidenceRow) => EvidenceRow) { return [...mapB.entries()].filter(([key]) => !mapA.has(key)).slice(0, 200).map(([, item]) => view(item)); }
function mapDelta(left: Map<string, EvidenceRow>, right: Map<string, EvidenceRow>, view: (row: EvidenceRow) => EvidenceRow) {
  return { added: added(left, right, view), removed: added(right, left, view), total_added: [...right.keys()].filter((key) => !left.has(key)).length, total_removed: [...left.keys()].filter((key) => !right.has(key)).length };
}
function findingView(item: EvidenceRow) { return { rule_id: item.rule_id, severity: item.severity, summary: item.summary, actionability: item.actionability, evidence_class: item.evidence_class }; }
function dependencyView(item: EvidenceRow) { return { name: item.name, version: item.version, relationship: item.relationship, advisory_count: Array.isArray(item.advisories) ? item.advisories.length : 0 }; }
function fileView(item: EvidenceRow) { return { path: item.path, sha256: item.sha256, size_bytes: item.size_bytes, kind: item.kind }; }
