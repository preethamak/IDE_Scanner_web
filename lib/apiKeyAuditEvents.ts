import type { TeamAuditEvent } from "@/lib/teamAudit";

type ApiKeyUsageRow = Record<string, unknown> & {
  id?: unknown;
  key_id?: unknown;
  method?: unknown;
  endpoint?: unknown;
  created_at?: unknown;
};

/** Maps private API key activity to audit-safe records with no credential material. */
export function apiKeyUsageAuditEvents(
  workspaceId: string,
  usageRows: ApiKeyUsageRow[],
): TeamAuditEvent[] {
  return usageRows.map((usage) => ({
    event_id: `api-key-usage:${String(usage.id)}`,
    workspace_id: workspaceId,
    actor_id: null,
    action: "api_key_used",
    object_type: "api_key",
    object_id: String(usage.key_id),
    extension_id: null,
    version: null,
    previous_state: null,
    resulting_state: {
      method: text(usage.method),
      endpoint: text(usage.endpoint),
    },
    rationale: "Machine credential accessed the GuardRails API.",
    risk_level: null,
    receipt_id: String(usage.id),
    occurred_at: String(usage.created_at),
  }));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 500) : "";
}
