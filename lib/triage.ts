import type { ExtensionSummary } from "@/lib/types";

export type TriageBucket = {
  id: string;
  label: string;
  description: string;
  extensions: ExtensionSummary[];
};

export function buildTriageBuckets(extensions: ExtensionSummary[]): TriageBucket[] {
  return [
    {
      id: "remove",
      label: "Remove now",
      description: "Confirmed malicious or very high malware confidence.",
      extensions: extensions.filter((item) => item.verdict === "malicious" || item.malware_score >= 90)
    },
    {
      id: "sandbox",
      label: "Sandbox next",
      description: "Suspicious or high-risk extensions that need runtime observation.",
      extensions: extensions.filter((item) => item.verdict === "suspicious" || item.risk_score >= 80 || item.malware_score >= 60)
    },
    {
      id: "review",
      label: "Manual review",
      description: "Powerful, agentic, dependency, or provenance signals without confirmed malware.",
      extensions: extensions.filter((item) => item.verdict === "review" && item.risk_score < 80 && item.malware_score < 60)
    },
    {
      id: "watch",
      label: "Watch list",
      description: "Clean or low-score extensions with context-only findings.",
      extensions: extensions.filter((item) => item.verdict === "clean" && (item.risk_score > 0 || item.finding_count > 0))
    }
  ];
}

export function topAction(buckets: TriageBucket[]): string {
  const first = buckets.find((bucket) => bucket.extensions.length > 0);
  if (!first) return "No action required from the latest scan.";
  return `${first.extensions.length} extension(s) in ${first.label.toLowerCase()}.`;
}
