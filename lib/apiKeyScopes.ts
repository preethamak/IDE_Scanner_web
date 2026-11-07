export const apiKeyScopes = ["gate:read"] as const;

export type ApiKeyScope = (typeof apiKeyScopes)[number];

const knownScopes = new Set<string>(apiKeyScopes);

export function normalizeApiKeyScopes(input: unknown, fallback: readonly ApiKeyScope[] = apiKeyScopes): ApiKeyScope[] | null {
  if (input === undefined) return [...fallback];
  if (!Array.isArray(input) || input.length === 0) return null;

  const scopes = [...new Set(input.map((scope) => String(scope).trim()))];
  if (scopes.some((scope) => !knownScopes.has(scope))) return null;
  return scopes as ApiKeyScope[];
}

export function hasApiKeyScopes(granted: unknown, required: readonly ApiKeyScope[]): boolean {
  const scopes = normalizeApiKeyScopes(granted, []);
  return Boolean(scopes && required.every((scope) => scopes.includes(scope)));
}
