export const CAPABILITIES = [
  "filesystem",
  "network",
  "process",
  "secret",
  "clipboard",
  "editor",
  "tool",
] as const;

export type Capability = (typeof CAPABILITIES)[number];
export type PolicyEffect = "allow" | "deny";
export type ApprovalMode = "automatic" | "prompt";
export type DecisionOutcome = "allow" | "deny" | "prompt";

export interface CapabilityRequest {
  id: string;
  principalId: string;
  workspaceId: string;
  capability: Capability;
  action: string;
  resource: string;
  requestedAt: string;
}

export interface CapabilityGrant {
  id: string;
  principalId: string;
  workspaceId: string;
  capability: Capability;
  actions: readonly string[];
  resourcePattern: string;
  effect: PolicyEffect;
  approval: ApprovalMode;
  expiresAt?: string;
}

export type DecisionReason =
  | "INVALID_REQUEST"
  | "EXPLICIT_DENY"
  | "NO_MATCHING_GRANT"
  | "APPROVAL_REQUIRED"
  | "GRANT_ALLOWED";

export interface PolicyDecision {
  outcome: DecisionOutcome;
  reason: DecisionReason;
  requestId: string;
  matchingGrantId?: string;
}

const validCapabilities = new Set<string>(CAPABILITIES);

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isValidRequest(request: CapabilityRequest): boolean {
  return Boolean(
    request.id.trim() &&
      request.principalId.trim() &&
      request.workspaceId.trim() &&
      validCapabilities.has(request.capability) &&
      request.action.trim() &&
      request.resource.trim() &&
      isValidDate(request.requestedAt),
  );
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

/**
 * Matches a deliberately small policy glob language. `*` stays within one path
 * segment while `**` may cross `/` boundaries. Policy resources always use `/`
 * separators, including URL-like resources.
 */
export function matchesResource(pattern: string, resource: string): boolean {
  if (!pattern || !resource || pattern.includes("\0") || resource.includes("\0")) {
    return false;
  }

  const token = "\u0001";
  const expression = escapeRegularExpression(pattern)
    .replaceAll("**", token)
    .replaceAll("*", "[^/]*")
    .replaceAll(token, ".*");

  return new RegExp(`^${expression}$`, "u").test(resource);
}

function grantMatches(
  grant: CapabilityGrant,
  request: CapabilityRequest,
  requestedAt: number,
): boolean {
  const expiration = grant.expiresAt ? Date.parse(grant.expiresAt) : undefined;

  return (
    grant.principalId === request.principalId &&
    grant.workspaceId === request.workspaceId &&
    grant.capability === request.capability &&
    grant.actions.includes(request.action) &&
    matchesResource(grant.resourcePattern, request.resource) &&
    (expiration === undefined || (Number.isFinite(expiration) && expiration > requestedAt))
  );
}

/**
 * Evaluates immutable grants with fail-closed, deny-overrides semantics.
 * The caller must canonicalize filesystem paths and network destinations before
 * constructing the request; OS enforcement belongs to the broker boundary.
 */
export function evaluatePolicy(
  request: CapabilityRequest,
  grants: readonly CapabilityGrant[],
): PolicyDecision {
  if (!isValidRequest(request)) {
    return { outcome: "deny", reason: "INVALID_REQUEST", requestId: request.id };
  }

  const requestedAt = Date.parse(request.requestedAt);
  const matching = grants.filter((grant) => grantMatches(grant, request, requestedAt));
  const denied = matching.find((grant) => grant.effect === "deny");

  if (denied) {
    return {
      outcome: "deny",
      reason: "EXPLICIT_DENY",
      requestId: request.id,
      matchingGrantId: denied.id,
    };
  }

  const allowed = matching.find((grant) => grant.effect === "allow");
  if (!allowed) {
    return { outcome: "deny", reason: "NO_MATCHING_GRANT", requestId: request.id };
  }

  if (allowed.approval === "prompt") {
    return {
      outcome: "prompt",
      reason: "APPROVAL_REQUIRED",
      requestId: request.id,
      matchingGrantId: allowed.id,
    };
  }

  return {
    outcome: "allow",
    reason: "GRANT_ALLOWED",
    requestId: request.id,
    matchingGrantId: allowed.id,
  };
}
