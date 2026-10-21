const EXTENSION_ID = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/;
const SHA256 = /^[a-f0-9]{64}$/i;
const RELATIONSHIPS = new Set(["extension_pack", "extension_dependency"]);

export type RelationshipEvidenceExport = {
  declared: Array<{ extension_id: string; relationship: string }>;
  resolution: Array<{ extension_id: string; relationship: string; status: string; resolved_extension_id: string | null; resolved_version: string | null; resolved_artifact_sha256: string | null }>;
  requires_separate_review: boolean;
};

export function exportRelationshipEvidence(value: unknown): RelationshipEvidenceExport {
  const inventory = object(value);
  const relationships = object(inventory.extension_relationship_inventory);
  const declared = Array.isArray(relationships.entries) ? relationships.entries.flatMap((entry) => {
    const record = object(entry);
    const extensionId = String(record.extension_id || "").trim().toLowerCase();
    const relationship = String(record.relationship || "");
    return EXTENSION_ID.test(extensionId) && RELATIONSHIPS.has(relationship) ? [{ extension_id: extensionId, relationship }] : [];
  }) : [];
  const resolution = Array.isArray(relationships.resolution) ? relationships.resolution.flatMap((entry) => {
    const record = object(entry);
    const extensionId = String(record.extension_id || "").trim().toLowerCase();
    const relationship = String(record.relationship || "");
    const status = String(record.status || "").trim();
    if (!EXTENSION_ID.test(extensionId) || !RELATIONSHIPS.has(relationship) || !status) return [];
    const resolvedId = String(record.resolved_extension_id || "").trim().toLowerCase();
    const hash = String(record.resolved_artifact_sha256 || "").trim().toLowerCase();
    return [{
      extension_id: extensionId,
      relationship,
      status,
      resolved_extension_id: EXTENSION_ID.test(resolvedId) ? resolvedId : null,
      resolved_version: record.resolved_version ? String(record.resolved_version) : null,
      resolved_artifact_sha256: SHA256.test(hash) ? hash : null,
    }];
  }) : [];
  const resolutionByKey = new Map(resolution.map((entry) => [`${entry.relationship}:${entry.extension_id}`, entry]));
  return {
    declared: unique(declared).sort(compare),
    resolution: unique(resolution).sort(compare),
    requires_separate_review: declared.some((entry) => {
      const result = resolutionByKey.get(`${entry.relationship}:${entry.extension_id}`);
      return !result || result.status !== "scanned" || !result.resolved_version || !result.resolved_artifact_sha256;
    }),
  };
}

function unique<T extends { extension_id: string; relationship: string }>(entries: T[]) {
  return [...new Map(entries.map((entry) => [`${entry.relationship}:${entry.extension_id}`, entry])).values()];
}

function compare(left: { extension_id: string; relationship: string }, right: { extension_id: string; relationship: string }) {
  return `${left.relationship}:${left.extension_id}`.localeCompare(`${right.relationship}:${right.extension_id}`);
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
