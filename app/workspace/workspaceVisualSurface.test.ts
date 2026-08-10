import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("workspace visual surface", () => {
  it("leads with release decisions instead of a generic dashboard greeting", () => {
    const workspace = read("../TeamWorkspace.tsx");
    expect(workspace).toContain("Release pulse");
    expect(workspace).toContain("release needs");
    expect(workspace).toContain("Nothing urgent. Keep shipping.");
    expect(workspace).toContain("signalConstellation");
  });

  it("uses a warm editorial canvas with a floating navigation rail", () => {
    const css = read("./teamWorkspace.module.css");
    expect(css).toContain("2026 workspace canvas");
    expect(css).toContain(".focusDeck");
    expect(css).toContain(".signalConstellation");
    expect(css).toContain("#f7dce7");
  });
});
