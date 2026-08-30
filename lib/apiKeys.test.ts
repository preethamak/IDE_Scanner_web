import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "./apiKeys";

describe("generateApiKey", () => {
  it("returns a raw key whose hash matches an independent hash of the same raw key", () => {
    const { raw, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(raw));
  });

  it("never returns two equal raw keys across calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.raw).not.toBe(b.raw);
    expect(a.hash).not.toBe(b.hash);
  });

  it("exposes a stable, non-secret prefix for display in the UI", () => {
    const { raw, prefix } = generateApiKey();
    expect(raw.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(raw.length);
  });

  it("is recognized by looksLikeApiKey", () => {
    const { raw } = generateApiKey();
    expect(looksLikeApiKey(raw)).toBe(true);
    expect(looksLikeApiKey("Bearer sometoken")).toBe(false);
    expect(looksLikeApiKey("")).toBe(false);
  });
});
