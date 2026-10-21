import { parseCapabilityGraphImport, mergeCollectorCapabilityGraph } from "@/lib/teamCapabilityInventory";
import { parseTeamInventoryImport, type TeamInventoryImport } from "@/lib/teamInventory";
import type { CapabilityGraph } from "@/lib/capabilityGraph";

export type CollectorSnapshot = { inventory: TeamInventoryImport; graph: CapabilityGraph };

export class CollectorValidationError extends Error {
  constructor(message: string) { super(message); this.name = "CollectorValidationError"; }
}

export function parseCollectorSnapshot(value: unknown, workspaceId: string): CollectorSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CollectorValidationError("Upload a collector snapshot object.");
  const raw = value as Record<string, unknown>;
  try {
    const inventory = parseTeamInventoryImport(raw.inventory);
    const graph = parseCapabilityGraphImport(raw.graph, workspaceId);
    if (graph.subjects.some((subject) => subject.source !== "collector")) throw new CollectorValidationError("Collector graph subjects must use source collector.");
    return { inventory: { ...inventory, source: "api" }, graph };
  } catch (error) {
    if (error instanceof CollectorValidationError) throw error;
    throw new CollectorValidationError(error instanceof Error ? error.message : "Collector snapshot is invalid.");
  }
}

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
