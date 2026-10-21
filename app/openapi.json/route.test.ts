import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GuardRails public OpenAPI document", () => {
  it("documents the exact-release gate, evidence export, and MCP boundary", async () => {
    const response = GET();
    const document = await response.json();
    expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
    expect(document).toMatchObject({ openapi: "3.1.0", paths: { "/api/gate": { get: expect.any(Object) }, "/api/gate/bulk": { post: expect.any(Object) }, "/api/mcp": { post: expect.any(Object) } } });
    expect(document.components.schemas.GateResult.properties.relationship_review).toBeDefined();
    const rateLimit = document.paths["/api/gate/bulk"].post.responses["429"];
    expect(rateLimit.headers["Retry-After"].schema).toMatchObject({ type: "integer", minimum: 1 });
    expect(rateLimit.content["application/json"].schema.$ref).toBe("#/components/schemas/RateLimitError");
    expect(document.paths["/api/gate/bulk"].post.responses["403"]).toBeDefined();
    expect(document.paths["/api/gate/bulk"].post.responses["503"]).toBeDefined();
  });
});
