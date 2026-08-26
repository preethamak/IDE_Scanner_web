import type { Alert, WatchItem } from "@/app/workspace/types";
import type { QueueDecision } from "@/lib/teamDecisionQueue";

export const sampleDecisions: QueueDecision[] = [
  {
    id: "sample-cline",
    scan_id: "sample-scan",
    decision: "review",
    extension_id: "saoudrizwan.claude-dev",
    version: "3.19.0",
    assigned_to: null,
    due_at: "2026-08-07T17:00:00.000Z",
    resolved_at: null,
    updated_at: "2026-08-06T12:00:00.000Z",
  },
  {
    id: "sample-docker",
    scan_id: "sample-docker-scan",
    decision: "review",
    extension_id: "ms-azuretools.vscode-docker",
    version: "2.1.0",
    assigned_to: null,
    due_at: null,
    resolved_at: null,
    updated_at: "2026-08-06T10:00:00.000Z",
  },
];
export const sampleWatches: WatchItem[] = [
  {
    extension_id: "saoudrizwan.claude-dev",
    created_at: "2026-07-12T00:00:00.000Z",
    baseline_version: "3.18.2",
    monitoring_state: "comparison_ready",
    extensions: { display_name: "Cline" },
  },
  {
    extension_id: "ms-python.python",
    created_at: "2026-07-10T00:00:00.000Z",
    baseline_version: "2026.5",
    monitoring_state: "monitoring",
    extensions: { display_name: "Python" },
  },
  {
    extension_id: "dbaeumer.vscode-eslint",
    created_at: "2026-07-09T00:00:00.000Z",
    baseline_version: "3.0.10",
    monitoring_state: "monitoring",
    extensions: { display_name: "ESLint" },
  },
];
export const sampleAlerts: Alert[] = [
  {
    id: "sample-alert",
    title: "Cline added command and network access",
    summary:
      "Version 3.19.0 requests two capabilities that were not present in the reviewed baseline.",
    severity: "HIGH",
    state: "open",
    extension_id: "saoudrizwan.claude-dev",
    version: "3.19.0",
  },
];
