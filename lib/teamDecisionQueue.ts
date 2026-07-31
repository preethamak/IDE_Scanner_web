export type QueueDecision = {
  id: string;
  scan_id: string;
  decision: string;
  extension_id: string;
  version: string;
  rationale?: string;
  assigned_to?: string | null;
  due_at: string | null;
  resolved_at: string | null;
  updated_at: string;
};

export type DecisionQueue = { open: QueueDecision[]; dueSoon: QueueDecision[]; resolved: QueueDecision[] };

export function groupDecisionQueue(decisions: QueueDecision[], now = new Date()): DecisionQueue {
  const threshold = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const result: DecisionQueue = { open: [], dueSoon: [], resolved: [] };
  for (const decision of decisions) {
    if (decision.resolved_at) result.resolved.push(decision);
    else if (decision.due_at && new Date(decision.due_at).getTime() <= threshold) result.dueSoon.push(decision);
    else result.open.push(decision);
  }
  for (const items of Object.values(result)) items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return result;
}
