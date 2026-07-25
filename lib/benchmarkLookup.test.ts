import { describe, expect, it } from "vitest";
import { benchmarkValidation } from "@/lib/benchmarkLookup";

describe("benchmark artifact identity", () => {
  it("accepts only the currently frozen bytes for a mutable Marketplace version", () => {
    const id = "ms-python.python";
    const version = "2026.5.2026070801";

    expect(
      benchmarkValidation(
        id,
        version,
        "95d8af5d113124f8795a31fffe9eae75fafc7ed4de73ae1a90656cf166aebefa",
      ),
    ).toMatchObject({ id, version });
    expect(
      benchmarkValidation(
        id,
        version,
        "7edf45e8e93fd155373fdf80000c56e75344e519442ba570b453da318abe18b8",
      ),
    ).toBeNull();
  });
});
