import { createHash } from "node:crypto";
import { CAPABILITIES, type CapabilityGrant } from "@/lib/guardrailsPolicy";
import { evaluateCapabilityGraph, type CapabilityGraph } from "@/lib/capabilityGraph";

export const CAPABILITY_POLICY_SCHEMA = "guardrails.capability-policy.v1";
export type StoredCapabilityPolicy = { schema: typeof CAPABILITY_POLICY_SCHEMA; version: number; grants: CapabilityGrant[]; updated_at: string; updated_by: string };

export class CapabilityPolicyValidationError extends Error { constructor(message: string) { super(message); this.name = "CapabilityPolicyValidationError"; } }

export function parseCapabilityPolicy(value: unknown, workspaceId: string, actorId: string, previousVersion = 0): StoredCapabilityPolicy {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CapabilityPolicyValidationError("Policy must be a JSON object with a grants array.");
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.grants) || raw.grants.length > 500) throw new CapabilityPolicyValidationError("Policy grants must contain between 0 and 500 entries.");
  const ids = new Set<string>();
  const grants = raw.grants.map((entry, index) => validateGrant(entry, workspaceId, ids, index));
  return { schema: CAPABILITY_POLICY_SCHEMA, version: previousVersion + 1, grants, updated_at: new Date().toISOString(), updated_by: actorId };
}

export function buildCapabilityPolicyExport(policy: StoredCapabilityPolicy, graph: CapabilityGraph, principalId = "workspace:enforcement") {
  const evaluations = evaluateCapabilityGraph(graph, policy.grants, principalId, graph.generatedAt);
  const payload = { schema: CAPABILITY_POLICY_SCHEMA, generated_at: new Date().toISOString(), workspace_id: graph.workspaceId, policy_version: policy.version, default_action: "deny" as const, grants: policy.grants, graph: { generated_at: graph.generatedAt, subjects: graph.subjects.map((subject) => ({ id: subject.id, kind: subject.kind, version: subject.version, artifact_sha256: subject.artifactSha256, evidence_state: subject.evidenceState, capabilities: subject.capabilities })) }, evaluations: evaluations.map((item) => ({ subject_id: item.subject.id, outcome: item.outcome, requests: item.requests.map((request) => ({ capability: request.request.capability, decision: request.decision.outcome, reason: request.decision.reason, grant_id: request.decision.matchingGrantId || null })) })) };
  return { ...payload, policy_hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex") };
}

function validateGrant(value: unknown, workspaceId: string, ids: Set<string>, index: number): CapabilityGrant {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CapabilityPolicyValidationError(`Grant ${index + 1} must be an object.`);
  const raw = value as Record<string, unknown>;
  const id = text(raw.id); const principalId = text(raw.principalId); const capability = text(raw.capability); const resourcePattern = text(raw.resourcePattern); const effect = text(raw.effect); const approval = text(raw.approval);
  const actions = Array.isArray(raw.actions) ? raw.actions.map(text).filter(Boolean) : [];
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(id) || ids.has(id)) throw new CapabilityPolicyValidationError(`Grant ${index + 1} needs a unique stable id.`);
  if (!principalId || principalId.length > 200 || !CAPABILITIES.includes(capability as typeof CAPABILITIES[number]) || !actions.length || actions.length > 20 || actions.some((action) => action.length > 80) || !resourcePattern || resourcePattern.length > 400 || !["allow", "deny"].includes(effect) || !["automatic", "prompt"].includes(approval)) throw new CapabilityPolicyValidationError(`Grant ${index + 1} has an invalid principal, capability, action, resource, effect, or approval.`);
  if (effect === "deny" && approval !== "automatic") throw new CapabilityPolicyValidationError(`Grant ${index + 1} deny rules must use automatic approval.`);
  const expiresAt = raw.expiresAt === undefined || raw.expiresAt === null || raw.expiresAt === "" ? undefined : text(raw.expiresAt);
  if (expiresAt && !Number.isFinite(Date.parse(expiresAt))) throw new CapabilityPolicyValidationError(`Grant ${index + 1} has an invalid expiration.`);
  ids.add(id);
  return { id, principalId, workspaceId, capability: capability as CapabilityGrant["capability"], actions, resourcePattern, effect: effect as CapabilityGrant["effect"], approval: approval as CapabilityGrant["approval"], ...(expiresAt ? { expiresAt } : {}) };
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
