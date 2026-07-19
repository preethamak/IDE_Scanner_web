export type PublicOutcome = "clear" | "expected_capability" | "investigate" | "preventive_block" | "confirmed_threat" | "incomplete";

export const PUBLIC_OUTCOMES: Record<PublicOutcome, { label: string; short: string; explanation: string; tone: "allow" | "review" | "block" | "incomplete" }> = {
  clear: { label: "Allow · no concerning evidence", short: "Allow · clear", explanation: "Required analysis completed without unexplained security evidence.", tone: "allow" },
  expected_capability: { label: "Allow · expected capability", short: "Allow · expected power", explanation: "Powerful behavior matches an established publisher and a versioned capability profile.", tone: "allow" },
  investigate: { label: "Investigate · unexplained behavior", short: "Investigate", explanation: "The artifact contains behavior that is not fully explained by its provenance and expected purpose.", tone: "review" },
  preventive_block: { label: "Block · high-specificity abuse path", short: "Block · abuse path", explanation: "A strong abuse path crossed the preventive policy, without being labeled confirmed malware.", tone: "block" },
  confirmed_threat: { label: "Block · confirmed threat", short: "Block · confirmed", explanation: "Authoritative threat evidence or exact known-bad artifact identity matched.", tone: "block" },
  incomplete: { label: "Analysis incomplete", short: "Incomplete", explanation: "Required analyzers did not complete, so the artifact cannot receive an approval result.", tone: "incomplete" },
};

export function normalizePublicOutcome(value: unknown, decision?: unknown, verdict?: unknown): PublicOutcome {
  const outcome = String(value || "") as PublicOutcome;
  if (outcome in PUBLIC_OUTCOMES) return outcome;
  if (decision === "allow") return "clear";
  if (decision === "review") return "investigate";
  if (decision === "block") return verdict === "malicious" ? "confirmed_threat" : "preventive_block";
  return "incomplete";
}

export function outcomeMeta(value: unknown, decision?: unknown, verdict?: unknown) {
  return PUBLIC_OUTCOMES[normalizePublicOutcome(value, decision, verdict)];
}
