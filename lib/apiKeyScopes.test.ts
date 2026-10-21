import { describe, expect, it } from "vitest";
import { hasApiKeyScopes, normalizeApiKeyScopes } from "@/lib/apiKeyScopes";

describe("API key scopes", () => {
  it("defaults newly-issued keys to the supported bulk-gate scope", () => {
    expect(normalizeApiKeyScopes(undefined)).toEqual(["gate:read"]);
  });

  it("accepts an explicit de-duplicated supported scope set", () => {
    expect(normalizeApiKeyScopes(["gate:read", "gate:read"])).toEqual(["gate:read"]);
  });

  it("rejects empty or unknown scope sets", () => {
    expect(normalizeApiKeyScopes([])).toBeNull();
    expect(normalizeApiKeyScopes(["workspace:write"])).toBeNull();
  });

  it("requires every requested scope", () => {
    expect(hasApiKeyScopes(["gate:read"], ["gate:read"])).toBe(true);
    expect(hasApiKeyScopes([], ["gate:read"])).toBe(false);
  });
});
