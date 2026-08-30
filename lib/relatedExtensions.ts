export type RelatedCurrent = {
  extension_id: string;
  display_name: string;
  description: string;
  publisher: string;
  decision: string;
  severity?: string;
};

export type RelatedCandidate = {
  extension_id: string;
  display_name: string;
  publisher: string;
  publisher_verified: boolean;
  description: string;
  icon_url: string;
  decision: string;
  severity: string;
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "your", "you", "that", "this", "from", "into",
  "extension", "extensions", "vscode", "code", "visual", "studio", "support",
  "supports", "tool", "tools", "plugin", "provides", "language", "file", "files",
  "all", "any", "are", "can", "has", "have", "not", "our", "use", "using", "when",
  "more", "most", "new", "get", "its", "via", "within", "without", "based", "easy",
]);

const DECISION_RANK: Record<string, number> = { allow: 0, review: 1, incomplete: 2, "not-scanned": 3, block: 4 };
const SEVERITY_RANK: Record<string, number> = { INFO: 1, LOW: 2, MEDIUM: 3, HIGH: 4, CRITICAL: 5 };

export function tokenizeForMatch(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of String(text || "").toLowerCase().split(/[^a-z0-9+#]+/)) {
    if (raw.length >= 3 && !STOPWORDS.has(raw)) tokens.add(raw);
  }
  return tokens;
}

function decisionRank(decision: string): number {
  const rank = DECISION_RANK[String(decision || "").toLowerCase()];
  return rank === undefined ? 3 : rank;
}

function severityRank(severity: string): number {
  return SEVERITY_RANK[String(severity || "").toUpperCase()] || 0;
}

/** Lower is safer: decision dominates, severity breaks ties. */
export function safetyRank(decision: string, severity?: string): number {
  return decisionRank(decision) * 10 + severityRank(severity || "");
}

/**
 * Pick up to `limit` other extensions that serve a similar purpose (keyword
 * overlap on display name + description) and are safer than or equal to the
 * current extension. Prefers "allow" decisions, verified publishers, and lower
 * severity. Returns [] when nothing qualifies.
 */
export function rankRelatedExtensions(
  current: RelatedCurrent,
  candidates: RelatedCandidate[],
  limit = 4,
): RelatedCandidate[] {
  const currentTokens = tokenizeForMatch(`${current.display_name} ${current.description}`);
  const currentSafety = safetyRank(current.decision, current.severity);
  const currentId = String(current.extension_id || "").toLowerCase();
  const best = new Map<string, { candidate: RelatedCandidate; score: number }>();
  for (const candidate of candidates) {
    const id = String(candidate.extension_id || "").toLowerCase();
    if (!id || id === currentId) continue;
    if (safetyRank(candidate.decision, candidate.severity) > currentSafety) continue;
    const tokens = tokenizeForMatch(`${candidate.display_name} ${candidate.description}`);
    let overlap = 0;
    for (const token of tokens) if (currentTokens.has(token)) overlap += 1;
    if (overlap === 0) continue;
    const score =
      overlap * 10 +
      (String(candidate.decision).toLowerCase() === "allow" ? 6 : 0) +
      (candidate.publisher_verified ? 3 : 0) +
      (5 - severityRank(candidate.severity));
    const existing = best.get(id);
    if (!existing || score > existing.score) best.set(id, { candidate, score });
  }
  return [...best.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        safetyRank(a.candidate.decision, a.candidate.severity) -
          safetyRank(b.candidate.decision, b.candidate.severity) ||
        a.candidate.extension_id.localeCompare(b.candidate.extension_id),
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.candidate);
}
