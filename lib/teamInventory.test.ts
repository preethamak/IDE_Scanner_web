import { describe, expect, it } from "vitest";
import { InventoryValidationError, parseTeamInventoryImport } from "./teamInventory";

const valid = {
  device: { id: "engineering-laptop-01", name: "Engineering laptop", platform: "linux" },
  reported_at: "2026-08-18T10:00:00.000Z",
  source: "cli",
  extensions: [
    { extension_id: "GitHub.copilot", version: "1.388.0", registry: "vs-marketplace" },
  ],
};

describe("team inventory import contract", () => {
  it("normalizes a bounded inventory snapshot", () => {
    expect(parseTeamInventoryImport(valid)).toEqual(valid);
  });

  it("defaults optional source and registry fields without guessing a marketplace", () => {
    const result = parseTeamInventoryImport({
      ...valid,
      source: undefined,
      extensions: [{ extension_id: "redhat.java", version: "1.2.3" }],
    });
    expect(result.source).toBe("json");
    expect(result.extensions[0].registry).toBe("unknown");
  });

  it.each([
    [{ ...valid, device: { ...valid.device, id: "../../host" } }, "Device id"],
    [{ ...valid, extensions: [{ extension_id: "invalid", version: "1" }] }, "invalid extension_id"],
    [{ ...valid, extensions: [...valid.extensions, { ...valid.extensions[0], extension_id: "github.Copilot" }] }, "listed more than once"],
    [{ ...valid, extensions: Array.from({ length: 1001 }, (_, index) => ({ extension_id: `publisher.extension-${index}`, version: "1" })) }, "at most 1000"],
  ])("rejects invalid or abusive snapshots", (input, message) => {
    expect(() => parseTeamInventoryImport(input)).toThrowError(new RegExp(message, "i"));
  });

  it("uses a typed validation error", () => {
    expect(() => parseTeamInventoryImport(null)).toThrow(InventoryValidationError);
  });
});
