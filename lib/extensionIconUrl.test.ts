import { describe, expect, it } from "vitest";
import { extensionIconCandidates, extensionInitials } from "./extensionIconUrl";

describe("extension icon candidates", () => {
  it("uses the cached proxy before the original remote URL", () => {
    const source = "https://publisher.gallerycdn.vsassets.io/icon.png";
    expect(extensionIconCandidates(source)).toEqual([
      `/api/extension-icons?url=${encodeURIComponent(source)}`,
      source,
    ]);
  });

  it("keeps local assets local and rejects unsafe protocols", () => {
    expect(extensionIconCandidates("/extensions/local.png")).toEqual([
      "/extensions/local.png",
    ]);
    expect(extensionIconCandidates("file:///etc/passwd")).toEqual([]);
    expect(extensionIconCandidates("javascript:alert(1)")).toEqual([]);
    expect(
      extensionIconCandidates("https://tracking.example/icon.png"),
    ).toEqual([]);
  });

  it("provides stable readable initials", () => {
    expect(extensionInitials("Microsoft", "Python")).toBe("MI");
    expect(extensionInitials("", "Cline")).toBe("CL");
    expect(extensionInitials("---", "")).toBe("EX");
  });
});
