import type { TeamDecision } from "@/lib/teams";

export type DecisionSnapshot = {
  decision: TeamDecision;
  rationale: string;
  assigned_to: string | null;
  due_at: string | null;
  resolved_at: string | null;
};

export type DecisionEventKind = "created" | "updated" | "assigned" | "resolved" | "reopened";

export function decisionEventKind(before: DecisionSnapshot | null, after: DecisionSnapshot): DecisionEventKind {
  if (!before) return "created";
  if (before.resolved_at && !after.resolved_at) return "reopened";
  if (!before.resolved_at && after.resolved_at) return "resolved";
  if (before.assigned_to !== after.assigned_to) return "assigned";
  return "updated";
}
