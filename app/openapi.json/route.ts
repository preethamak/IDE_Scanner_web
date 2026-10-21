export const dynamic = "force-static";

const document = {
  openapi: "3.1.0",
  info: {
    title: "GuardRails Public API",
    version: "1.0.0",
    description: "Exact-release VS Code extension evidence. A pass applies only to the returned artifact and does not approve a later release or an unresolved related extension.",
  },
  servers: [{ url: "https://abscissa.dev" }],
  paths: {
    "/api/gate": {
      get: {
        summary: "Gate one exact extension release for CI",
        parameters: [
          { name: "extension", in: "query", required: true, schema: { type: "string" } },
          { name: "version", in: "query", required: true, schema: { type: "string" } },
          { name: "fail-on", in: "query", required: false, schema: { type: "string", enum: ["unreviewed"] } },
        ],
        responses: { "200": { description: "Pass or unreviewed exact release", content: { "application/json": { schema: { $ref: "#/components/schemas/GateResult" } } } }, "422": { description: "Release policy failed", content: { "application/json": { schema: { $ref: "#/components/schemas/GateResult" } } } }, "400": { description: "Invalid release identity" } },
      },
    },
    "/api/gate/bulk": {
      post: {
        summary: "Gate up to 200 exact releases for a team",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["checks"],
                properties: {
                  checks: {
                    type: "array",
                    maxItems: 200,
                    items: {
                      type: "object",
                      required: ["extension", "version"],
                      properties: { extension: { type: "string" }, version: { type: "string" } },
                    },
                  },
                  fail_on: { type: "string", enum: ["unreviewed"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Per-release results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: { type: "array", items: { $ref: "#/components/schemas/GateResult" } },
                    summary: { type: "object" },
                  },
                },
              },
            },
          },
          "401": { description: "Missing or invalid API key" },
          "403": { description: "The API key belongs to a workspace without the required Team entitlement", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "429": {
            description: "The per-key bulk-gate budget is exhausted; retry after the advertised window.",
            headers: {
              "Retry-After": { description: "Seconds until the current per-key rate-budget window resets.", schema: { type: "integer", minimum: 1 } },
              "Cache-Control": { description: "Always private, no-store for a rate-limited response.", schema: { type: "string" } },
            },
            content: { "application/json": { schema: { $ref: "#/components/schemas/RateLimitError" } } },
          },
          "503": { description: "Authentication, rate-budget, or analysis storage is temporarily unavailable", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
    "/api/extensions/{id}/versions/{version}/export": { get: { summary: "Download the current completed public evidence record", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "version", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Evidence JSON" }, "404": { description: "No completed public report" } } } },
    "/api/mcp": { post: { summary: "GuardRails Streamable HTTP MCP endpoint", description: "JSON-RPC 2.0, read-only. Use tools/list to discover the live tool schemas. Workspace tools require OAuth workspace:read authorization.", responses: { "200": { description: "MCP JSON-RPC result" }, "401": { description: "MCP authorization required" } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    schemas: {
      GateResult: {
        type: "object",
        required: ["extension", "version", "verdict", "relationship_review"],
        properties: {
          extension: { type: "string" },
          version: { type: "string" },
          verdict: { type: "string", enum: ["pass", "fail", "unreviewed"] },
          decision: { type: ["string", "null"] },
          reason: { type: "string" },
          report: { type: ["string", "null"] },
          relationship_review: {
            type: "object",
            required: ["declared", "scanned", "required"],
            properties: {
              declared: { type: "integer" },
              scanned: { type: "integer" },
              required: { type: "boolean" },
            },
          },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" }, code: { type: "string" } },
      },
      RateLimitError: {
        allOf: [
          { $ref: "#/components/schemas/Error" },
          { type: "object", required: ["code"], properties: { code: { type: "string", const: "RATE_LIMITED" } } },
        ],
      },
    },
  },
};

export function GET() {
  return Response.json(document, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400", "X-Content-Type-Options": "nosniff" } });
}
