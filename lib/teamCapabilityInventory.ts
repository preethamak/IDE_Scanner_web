import {
  buildCapabilityGraph,
  type CapabilityGraph,
  type CapabilityGraphInput,
  type CapabilitySubject,
} from "@/lib/capabilityGraph";

export class CapabilityInventoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapabilityInventoryValidationError";
  }
}

export function parseCapabilityGraphImport(value: unknown, workspaceId: string): CapabilityGraph {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CapabilityInventoryValidationError("Upload a capability graph JSON object.");
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.subjects)) throw new CapabilityInventoryValidationError("Capability graph subjects must be an array.");
  if (raw.subjects.length > 500) throw new CapabilityInventoryValidationError("One capability graph can contain at most 500 subjects.");
  try {
    return buildCapabilityGraph({
      workspaceId,
      generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
      subjects: raw.subjects as CapabilitySubject[],
      relationships: Array.isArray(raw.relationships) ? raw.relationships as CapabilityGraphInput["relationships"] : [],
    });
  } catch (error) {
    throw new CapabilityInventoryValidationError(error instanceof Error ? error.message : "Capability graph is invalid.");
  }
}

export function graphWithWorkspaceExtensions(
  workspaceId: string,
  installations: Array<Record<string, unknown>>,
  saved: CapabilityGraph | null | undefined,
): CapabilityGraph {
  const extensionSubjects: CapabilitySubject[] = installations.map((installation): CapabilitySubject => {
    const extensionId = text(installation.extension_id).toLowerCase();
    const version = text(installation.version);
    const hash = text(installation.artifact_sha256).toLowerCase();
    return {
      id: `extension:${extensionId}@${version}`,
      kind: "extension" as const,
      name: extensionId,
      version,
      publisher: extensionId.includes(".") ? extensionId.split(".")[0] : null,
      artifactSha256: /^[a-f0-9]{64}$/.test(hash) ? hash : null,
      evidenceState: /^[a-f0-9]{64}$/.test(hash) ? "verified" as const : "observed" as const,
      observedAt: validTime(text(installation.reported_at)) ? text(installation.reported_at) : new Date(0).toISOString(),
      capabilities: [],
      source: "workspace" as const,
    };
  }).filter((subject) => subject.id !== "extension:@");
  const savedSubjects = saved?.subjects || [];
  const subjects = [...extensionSubjects, ...savedSubjects.filter((subject) => subject.kind !== "extension")];
  const known = new Set(subjects.map((subject) => subject.id));
  return buildCapabilityGraph({
    workspaceId,
    generatedAt: saved?.generatedAt || undefined,
    subjects,
    relationships: (saved?.relationships || []).filter((relationship) => known.has(relationship.from) && known.has(relationship.to)),
  });
}

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function validTime(value: string): boolean { return Boolean(value) && Number.isFinite(Date.parse(value)); }
