import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GuardRails public OpenAPI document", () => {
  it("documents the exact-release gate, evidence export, and MCP boundary", async () => {
    const response = GET();
    const document = await response.json();
    expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(document).toMatchObject({ openapi: "3.1.0", paths: { "/api/gate": { get: expect.any(Object) }, "/api/gate/bulk": { post: expect.any(Object) }, "/api/mcp": { post: expect.any(Object) } } });
    expect(document.components.schemas.GateResult.properties.relationship_review).toBeDefined();
  });
});
