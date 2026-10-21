type UnknownRecord = Record<string, unknown>;

export type ExtensionRelationship = {
  extensionId: string;
  relationship: "extensionPack" | "extensionDependencies";
  declaredIn: string;
  resolution?: {
    status: string;
    extensionId?: string;
    version?: string;
    artifactSha256?: string;
  };
};

const RELATIONSHIPS = new Set<ExtensionRelationship["relationship"]>([
  "extensionPack",
  "extensionDependencies",
]);

export function extensionRelationships(inventory: unknown): ExtensionRelationship[] {
  const root = record(inventory);
  const relationshipInventory = record(root.extension_relationship_inventory);
  const entries = Array.isArray(relationshipInventory.entries) ? relationshipInventory.entries : [];
  const resolutions = Array.isArray(relationshipInventory.resolution) ? relationshipInventory.resolution : [];
  const resolutionByKey = new Map<string, UnknownRecord>();
  for (const raw of resolutions) {
    const item = record(raw);
    const extensionId = text(item.extension_id).toLowerCase();
    const relationship = text(item.relationship);
    if (extensionId && RELATIONSHIPS.has(relationship as ExtensionRelationship["relationship"])) {
      resolutionByKey.set(key(extensionId, relationship), item);
    }
  }
  const deduped = new Map<string, ExtensionRelationship>();
  for (const raw of entries) {
    const item = record(raw);
    const extensionId = text(item.extension_id).toLowerCase();
    const relationship = text(item.relationship);
    if (!extensionId || !RELATIONSHIPS.has(relationship as ExtensionRelationship["relationship"])) continue;
    const resolved = resolutionByKey.get(key(extensionId, relationship));
    deduped.set(key(extensionId, relationship), {
      extensionId,
      relationship: relationship as ExtensionRelationship["relationship"],
      declaredIn: text(item.declared_in) || "extension manifest",
      resolution: resolved ? {
        status: text(resolved.status) || "not_scanned",
        extensionId: text(resolved.resolved_extension_id) || undefined,
        version: text(resolved.resolved_version) || undefined,
        artifactSha256: text(resolved.resolved_artifact_sha256) || undefined,
      } : undefined,
    });
  }
  return [...deduped.values()].sort((left, right) => left.extensionId.localeCompare(right.extensionId));
}

export function relationshipResolutionLabel(status?: string): string {
  if (status === "scanned") return "Separately scanned";
  if (status === "already_scanned_as_requested_target") return "Already scanned as target";
  if (status === "skipped_self_reference") return "Self-reference skipped";
  if (status === "acquisition_failed") return "Acquisition failed";
  if (status === "not_scanned_limit_reached") return "Scan limit reached";
  return "Declared, not separately scanned";
}

function key(extensionId: string, relationship: string) {
  return `${relationship}:${extensionId}`;
}

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}
