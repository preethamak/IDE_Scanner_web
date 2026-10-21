export type ApiKeyUsageInput = { teamId: string; keyId: string; request: Request };

/**
 * Records only the integration shape needed for an audit trail. Never retain
 * a bearer value, request body, query string, IP address, or response data.
 */
export function apiKeyUsageRecord({ teamId, keyId, request }: ApiKeyUsageInput) {
  let endpoint = "/";
  try {
    endpoint = new URL(request.url).pathname;
  } catch {
    // Keep a safe, non-identifying value when a synthetic request is malformed.
  }
  return {
    team_id: teamId,
    key_id: keyId,
    method: request.method.toUpperCase().slice(0, 12),
    endpoint: endpoint.slice(0, 240),
  };
}
