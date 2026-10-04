export const trustRecordStatuses = ["approved", "revoked"] as const;
export type TrustRecordStatus = (typeof trustRecordStatuses)[number];

export const recallStates = ["open", "acknowledged", "closed"] as const;
export type RecallState = (typeof recallStates)[number];

const recallTransitions: Record<RecallState, readonly RecallState[]> = {
  open: ["open", "acknowledged", "closed"],
  acknowledged: ["acknowledged", "closed"],
  closed: ["closed"],
};

export const trustRegistries = ["vs-marketplace", "openvsx", "unknown"] as const;
export type TrustRegistry = (typeof trustRegistries)[number];

export type ArtifactIdentity = {
  extension_id: string;
  version: string;
  registry: TrustRegistry;
  artifact_sha256: string;
};

export type InventoryInstallation = {
  device_id: string;
  extension_id: string;
  version: string;
  artifact_sha256?: string | null;
};

export type CapabilityDelta = {
  added: string[];
  removed: string[];
  changed: Array<{ path: string; before: string; after: string }>;
  material: boolean;
};

export type RecallImpact = {
  exact_matches: number;
  version_only_matches: number;
  affected_devices: string[];
  installations: Array<{
    device_id: string;
    extension_id: string;
    version: string;
    artifact_sha256: string | null;
    match: "exact" | "version_only";
  }>;
};

export function isRecallTransitionAllowed(current: unknown, next: RecallState): boolean {
  return recallStates.includes(current as RecallState)
    && recallTransitions[current as RecallState].includes(next);
}

const SHA256 = /^[a-f0-9]{64}$/i;
const EXTENSION_ID = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/;

export function normalizeArtifactIdentity(input: {
  extension_id?: unknown;
  version?: unknown;
  registry?: unknown;
  artifact_sha256?: unknown;
}): ArtifactIdentity {
  const extensionId = text(input.extension_id);
  const version = text(input.version);
  const registry = input.registry === undefined || input.registry === null || input.registry === ""
    ? "unknown"
    : input.registry;
  const artifactSha256 = text(input.artifact_sha256).toLowerCase();
  if (!EXTENSION_ID.test(extensionId)) throw new Error("A valid extension id is required.");
  if (!version || version.length > 120) throw new Error("A valid extension version is required.");
  if (!trustRegistries.includes(registry as TrustRegistry)) throw new Error("The artifact registry is invalid.");
  if (!SHA256.test(artifactSha256)) throw new Error("A 64-character artifact SHA-256 is required.");
  return { extension_id: extensionId, version, registry: registry as TrustRegistry, artifact_sha256: artifactSha256 };
}

export function compareCapabilitySnapshots(before: unknown, after: unknown): CapabilityDelta {
  const previous = flattenSnapshot(before);
  const current = flattenSnapshot(after);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ path: string; before: string; after: string }> = [];
  for (const [path, value] of current) {
    if (!previous.has(path)) added.push(path);
    else if (previous.get(path) !== value) changed.push({ path, before: previous.get(path) || "", after: value });
  }
  for (const path of previous.keys()) if (!current.has(path)) removed.push(path);
  added.sort(); removed.sort(); changed.sort((a, b) => a.path.localeCompare(b.path));
  return { added, removed, changed, material: Boolean(added.length || removed.length || changed.length) };
}

export function recallImpact(installations: InventoryInstallation[], identity: ArtifactIdentity): RecallImpact {
  const matches = installations.flatMap((installation) => {
    if (installation.extension_id.toLowerCase() !== identity.extension_id.toLowerCase() || installation.version !== identity.version) return [];
    const artifact = textOrNull(installation.artifact_sha256)?.toLowerCase() || null;
    if (artifact && artifact !== identity.artifact_sha256) return [];
    return [{
      device_id: installation.device_id,
      extension_id: installation.extension_id,
      version: installation.version,
      artifact_sha256: artifact,
      match: artifact ? "exact" as const : "version_only" as const,
    }];
  });
  return {
    exact_matches: matches.filter((item) => item.match === "exact").length,
    version_only_matches: matches.filter((item) => item.match === "version_only").length,
    affected_devices: [...new Set(matches.map((item) => item.device_id))].sort(),
    installations: matches,
  };
}

function flattenSnapshot(value: unknown, path = "", output = new Map<string, string>()): Map<string, string> {
  if (value === null || value === undefined) {
    if (path) output.set(path, String(value));
    return output;
  }
  if (typeof value !== "object") {
    if (path) output.set(path, String(value));
    return output;
  }
  if (Array.isArray(value)) {
    if (path) output.set(path, JSON.stringify(value));
    return output;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path ? `${path}.${key}` : key;
    flattenSnapshot(child, childPath, output);
  }
  return output;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textOrNull(value: unknown): string | null {
  const result = text(value);
  return result || null;
}
