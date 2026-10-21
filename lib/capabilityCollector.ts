import { parseCapabilityGraphImport, mergeCollectorCapabilityGraph } from "@/lib/teamCapabilityInventory";
import { parseTeamInventoryImport, type TeamInventoryImport } from "@/lib/teamInventory";
import type { CapabilityGraph } from "@/lib/capabilityGraph";
import { createHash } from "node:crypto";

export const COLLECTOR_SNAPSHOT_SCHEMA = "guardrails.collector-snapshot.v1";
export type CollectorSnapshot = { schemaVersion: typeof COLLECTOR_SNAPSHOT_SCHEMA; inventory: TeamInventoryImport; graph: CapabilityGraph };

export class CollectorValidationError extends Error {
  constructor(message: string) { super(message); this.name = "CollectorValidationError"; }
}

export function parseCollectorSnapshot(value: unknown, workspaceId: string): CollectorSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CollectorValidationError("Upload a collector snapshot object.");
  const raw = value as Record<string, unknown>;
  try {
    if (raw.schema_version !== undefined && raw.schema_version !== COLLECTOR_SNAPSHOT_SCHEMA) throw new CollectorValidationError("Unsupported collector snapshot schema.");
    const inventory = parseTeamInventoryImport(raw.inventory);
    const graph = parseCapabilityGraphImport(raw.graph, workspaceId);
    if (graph.subjects.some((subject) => subject.source !== "collector")) throw new CollectorValidationError("Collector graph subjects must use source collector.");
    return { schemaVersion: COLLECTOR_SNAPSHOT_SCHEMA, inventory: { ...inventory, source: "api" }, graph };
  } catch (error) {
    if (error instanceof CollectorValidationError) throw error;
    throw new CollectorValidationError(error instanceof Error ? error.message : "Collector snapshot is invalid.");
  }
}

export function collectorSnapshotFingerprint(snapshot: CollectorSnapshot): string { const { generatedAt: _generatedAt, ...graph } = snapshot.graph; return createHash("sha256").update(stableJson({ ...snapshot, graph })).digest("hex"); }
export function collectorIdempotencyKey(value: string | null): string | null { if (!value) return null; const key = value.trim(); if (!/^[A-Za-z0-9._:-]{16,160}$/.test(key)) throw new CollectorValidationError("Idempotency-Key must be 16-160 URL-safe characters."); return key; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") { const row = value as Record<string, unknown>; return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stableJson(row[key])}`).join(",")}}`; } return JSON.stringify(value); }

export function applyCollectorSnapshot(input: { workspaceId: string; existingGraph: CapabilityGraph | null | undefined; inventory: { devices: Array<Record<string, unknown>>; installations: Array<Record<string, unknown>>; last_import_at: string | null }; snapshot: CollectorSnapshot }) {
  const { inventory: snapshot, graph } = input.snapshot;
  const device = { id: snapshot.device.id, external_id: snapshot.device.id, display_name: snapshot.device.name, platform: snapshot.device.platform, source: "api", last_seen_at: snapshot.reported_at };
  return {
    inventory: {
      devices: [device, ...input.inventory.devices.filter((item) => String(item.id) !== snapshot.device.id)],
      installations: [...input.inventory.installations.filter((item) => String(item.device_id) !== snapshot.device.id), ...snapshot.extensions.map((extension) => ({ device_id: snapshot.device.id, extension_id: extension.extension_id, version: extension.version, registry: extension.registry, artifact_sha256: extension.artifact_sha256, reported_at: snapshot.reported_at }))],
      last_import_at: snapshot.reported_at,
    },
    graph: mergeCollectorCapabilityGraph(input.workspaceId, input.existingGraph, graph),
  };
}
