import {
  evaluatePolicy,
  type Capability,
  type CapabilityGrant,
  type CapabilityRequest,
  type PolicyDecision,
} from "@/lib/guardrailsPolicy";

export const CAPABILITY_SUBJECT_KINDS = [
  "extension",
  "mcp_server",
  "agent_skill",
  "cli",
  "browser_extension",
] as const;

export const CAPABILITY_RELATIONSHIP_TYPES = [
  "installed_on",
  "uses",
  "approved_by",
  "governed_by",
] as const;

export type CapabilitySubjectKind = (typeof CAPABILITY_SUBJECT_KINDS)[number];
export type CapabilityEvidenceState = "verified" | "observed" | "unknown";
export type CapabilityRelationshipType = (typeof CAPABILITY_RELATIONSHIP_TYPES)[number];

export type CapabilitySubject = {
  id: string;
  kind: CapabilitySubjectKind;
  name: string;
  version: string | null;
  publisher: string | null;
  artifactSha256: string | null;
  evidenceState: CapabilityEvidenceState;
  observedAt: string;
  capabilities: readonly Capability[];
  source: "collector" | "workspace" | "manual";
};

export type CapabilityRelationship = {
  from: string;
  to: string;
  type: CapabilityRelationshipType;
};

export type CapabilityGraph = {
  schemaVersion: "2026-10-01";
  workspaceId: string;
  generatedAt: string;
  subjects: CapabilitySubject[];
  relationships: CapabilityRelationship[];
};

export type CapabilityGraphInput = {
  workspaceId: string;
  generatedAt?: string;
  subjects: readonly CapabilitySubject[];
  relationships?: readonly CapabilityRelationship[];
};

export type CapabilityEvaluation = {
  subject: CapabilitySubject;
  requests: Array<{ request: CapabilityRequest; decision: PolicyDecision }>;
  outcome: "allow" | "prompt" | "deny";
};

const subjectId = /^[a-z][a-z0-9_-]{0,31}:[A-Za-z0-9._:@/-]{1,300}$/;
const sha256 = /^[a-f0-9]{64}$/i;

export function capabilitySubjectId(kind: CapabilitySubjectKind, identity: string): string {
  const normalized = identity.trim().toLowerCase();
  if (!normalized || normalized.length > 300 || !/^[a-z0-9._:@/-]+$/.test(normalized)) {
    throw new Error("Capability identity must be a stable lowercase identifier.");
  }
  return `${kind}:${normalized}`;
}

export function buildCapabilityGraph(input: CapabilityGraphInput): CapabilityGraph {
  if (!input.workspaceId.trim()) throw new Error("A workspace id is required.");
  const seen = new Set<string>();
  const subjects = input.subjects.map((subject) => normalizeSubject(subject, seen));
  const knownSubjects = new Set(subjects.map((subject) => subject.id));
  const relationships = (input.relationships || []).map((relationship) => {
    if (!relationship || typeof relationship !== "object" || typeof relationship.from !== "string" || typeof relationship.to !== "string") {
      throw new Error("Capability relationship is invalid.");
    }
    const type = String((relationship as { type?: unknown }).type || "");
    if (!(CAPABILITY_RELATIONSHIP_TYPES as readonly string[]).includes(type)) {
      throw new Error("Capability relationship type is invalid.");
    }
    if (!knownSubjects.has(relationship.from) || !knownSubjects.has(relationship.to)) {
      throw new Error("Capability relationships must reference known subjects.");
    }
    return { ...relationship, type: type as CapabilityRelationshipType };
  });
  return {
    schemaVersion: "2026-10-01",
    workspaceId: input.workspaceId,
    generatedAt: validTime(input.generatedAt) ? input.generatedAt! : new Date().toISOString(),
    subjects,
    relationships,
  };
}

export function evaluateCapabilityGraph(
  graph: CapabilityGraph,
  grants: readonly CapabilityGrant[],
  principalId: string,
  requestedAt = new Date().toISOString(),
): CapabilityEvaluation[] {
  if (!principalId.trim()) throw new Error("A principal id is required.");
  if (!validTime(requestedAt)) throw new Error("requestedAt must be an ISO timestamp.");
  return graph.subjects.map((subject) => {
    const requests = subject.capabilities.map((capability) => {
      const request: CapabilityRequest = {
        id: `capability:${subject.id}:${capability}`,
        principalId,
        workspaceId: graph.workspaceId,
        capability,
        action: "use",
        resource: subject.id,
        requestedAt,
      };
      return { request, decision: evaluatePolicy(request, grants) };
    });
    return { subject, requests, outcome: aggregateOutcome(requests.map((item) => item.decision.outcome)) };
  });
}

function normalizeSubject(subject: CapabilitySubject, seen: Set<string>): CapabilitySubject {
  if (!subjectId.test(subject.id)) throw new Error("Capability subject id is invalid.");
  if (seen.has(subject.id)) throw new Error(`Capability subject ${subject.id} is duplicated.`);
  seen.add(subject.id);
  if (!CAPABILITY_SUBJECT_KINDS.includes(subject.kind)) throw new Error("Capability subject kind is invalid.");
  if (!subject.name.trim() || subject.name.length > 160) throw new Error("Capability subject name is invalid.");
  if (!validTime(subject.observedAt)) throw new Error("Capability observedAt must be an ISO timestamp.");
  if (subject.artifactSha256 && !sha256.test(subject.artifactSha256)) throw new Error("Artifact SHA-256 is invalid.");
  const capabilities = [...new Set(subject.capabilities)];
  if (capabilities.some((capability) => !["filesystem", "network", "process", "secret", "clipboard", "editor", "tool"].includes(capability))) {
    throw new Error("Capability subject contains an unsupported capability.");
  }
  return { ...subject, name: subject.name.trim(), capabilities, artifactSha256: subject.artifactSha256?.toLowerCase() || null };
}

function aggregateOutcome(outcomes: readonly PolicyDecision["outcome"][]): CapabilityEvaluation["outcome"] {
  if (outcomes.includes("deny")) return "deny";
  if (outcomes.includes("prompt")) return "prompt";
  return "allow";
}

function validTime(value: string | undefined): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
