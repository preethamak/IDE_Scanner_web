export const inventoryPlatforms = ["linux", "macos", "windows", "other"] as const;
export const inventoryRegistries = ["vs-marketplace", "openvsx", "unknown"] as const;
export type InventoryPlatform = (typeof inventoryPlatforms)[number];
export type InventoryRegistry = (typeof inventoryRegistries)[number];

export type TeamInventoryImport = {
  device: { id: string; name: string; platform: InventoryPlatform };
  reported_at: string;
  source: "cli" | "json" | "api";
  extensions: Array<{ extension_id: string; version: string; registry: InventoryRegistry }>;
};

export class InventoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryValidationError";
  }
}

export function parseTeamInventoryImport(value: unknown): TeamInventoryImport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InventoryValidationError("Upload a JSON object containing device and extensions fields.");
  }
  const input = value as Record<string, unknown>;
  const device = object(input.device, "A device object is required.");
  const id = boundedString(device.id, 160, "Device id is required.");
  if (!/^[A-Za-z0-9._:-]+$/.test(id)) {
    throw new InventoryValidationError("Device id may contain letters, numbers, dots, underscores, colons, and hyphens.");
  }
  const name = boundedString(device.name, 120, "Device name is required.");
  const platform = enumValue(device.platform, inventoryPlatforms, "Choose linux, macos, windows, or other for the device platform.");
  const source = input.source === undefined
    ? "json"
    : enumValue(input.source, ["cli", "json", "api"] as const, "Inventory source must be cli, json, or api.");
  const reportedAt = boundedString(input.reported_at, 64, "A valid reported_at timestamp is required.");
  const timestamp = new Date(reportedAt);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.getTime() > Date.now() + 5 * 60_000) {
    throw new InventoryValidationError("A valid reported_at timestamp is required and cannot be in the future.");
  }
  if (!Array.isArray(input.extensions)) {
    throw new InventoryValidationError("Extensions must be an array.");
  }
  if (input.extensions.length > 1000) {
    throw new InventoryValidationError("One inventory import can contain at most 1000 extensions.");
  }
  const seen = new Set<string>();
  const extensions = input.extensions.map((entry, index) => {
    const item = object(entry, `Extension ${index + 1} must be an object.`);
    const extensionId = boundedString(item.extension_id, 255, `Extension ${index + 1} requires an extension_id.`);
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+$/.test(extensionId)) {
      throw new InventoryValidationError(`Extension ${index + 1} has an invalid extension_id.`);
    }
    const key = extensionId.toLowerCase();
    if (seen.has(key)) throw new InventoryValidationError(`Extension ${extensionId} is listed more than once.`);
    seen.add(key);
    return {
      extension_id: extensionId,
      version: boundedString(item.version, 120, `Extension ${extensionId} requires a version.`),
      registry: item.registry === undefined
        ? "unknown"
        : enumValue(item.registry, inventoryRegistries, `Extension ${extensionId} has an invalid registry.`),
    };
  });
  return { device: { id, name, platform }, reported_at: timestamp.toISOString(), source, extensions };
}

function object(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InventoryValidationError(message);
  return value as Record<string, unknown>;
}

function boundedString(value: unknown, maximum: number, message: string): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > maximum) throw new InventoryValidationError(message);
  return result;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T, message: string): T[number] {
  if (typeof value !== "string" || !values.includes(value as T[number])) throw new InventoryValidationError(message);
  return value as T[number];
}
