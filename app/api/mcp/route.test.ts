import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBadgeDecision, getPublicInventory, lookupGateVerdict, isValidGateCheck, rankAlternatives, publicDb } = vi.hoisted(() => ({
  getBadgeDecision: vi.fn(),
  getPublicInventory: vi.fn(),
  lookupGateVerdict: vi.fn(),
  isValidGateCheck: vi.fn(),
  rankAlternatives: vi.fn(),
  publicDb: vi.fn(),
}));

vi.mock("@/lib/productData", () => ({ getBadgeDecision, getPublicInventory }));
vi.mock("@/lib/gateLookup", () => ({ lookupGateVerdict, isValidGateCheck }));
vi.mock("@/lib/alternatives", () => ({ rankAlternatives }));
vi.mock("@/lib/supabase", () => ({ publicDb }));
vi.mock("@/lib/trustTiers", () => ({ deriveTrustTier: vi.fn(() => ({ tier: "verified", summary: "Verified" })) }));

import { GET, OPTIONS, POST } from "./route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://abscissa.dev/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("public MCP endpoint", () => {
  beforeEach(() => {
    delete process.env.MCP_ACCESS_TOKEN;
    delete process.env.MCP_REQUIRE_AUTH;
    vi.clearAllMocks();
  });

  it("advertises read-only tools with schemas and safety annotations", async () => {
    const response = await POST(request({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-protocol-version")).toBe("2025-06-18");
    expect(body.result.tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "check_extension_risk", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "find_reputable_alternatives", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
    ]));
  });

  it("requires the configured early-access bearer token", async () => {
    process.env.MCP_ACCESS_TOKEN = "early-access-secret";
    const unauthorized = await POST(request({ jsonrpc: "2.0", id: 1, method: "ping" }));
    const authorized = await POST(request({ jsonrpc: "2.0", id: 1, method: "ping" }, { Authorization: "Bearer early-access-secret" }));
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("www-authenticate")).toContain("Bearer");
    expect(authorized.status).toBe(200);
  });

  it("fails closed when authentication is required without a configured token", async () => {
    process.env.MCP_REQUIRE_AUTH = "true";
    const response = await POST(request({ jsonrpc: "2.0", id: 1, method: "ping" }));
    expect(response.status).toBe(503);
  });

  it("rejects oversized streamed payloads before JSON-RPC dispatch", async () => {
    const response = await POST(request("x".repeat(64 * 1024 + 1)));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: -32600 } });
  });

  it("keeps the endpoint stateless and advertises supported methods", async () => {
    expect((await GET()).status).toBe(405);
    const options = OPTIONS();
    expect(options.status).toBe(204);
    expect(options.headers.get("allow")).toBe("POST, OPTIONS");
  });
});
