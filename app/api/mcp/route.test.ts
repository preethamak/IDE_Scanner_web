import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBadgeDecision, getExtensionProduct, getPublicAnalysisHistory, getPublicInventory, getVersionProduct, getVersionScanProduct, listCatalog, lookupGateVerdict, isValidGateCheck, rankAlternatives, publicDb, getActiveRuleCatalog, getPublicStatus } = vi.hoisted(() => ({
  getBadgeDecision: vi.fn(),
  getExtensionProduct: vi.fn(),
  getPublicAnalysisHistory: vi.fn(),
  getPublicInventory: vi.fn(),
  getVersionProduct: vi.fn(),
  getVersionScanProduct: vi.fn(),
  listCatalog: vi.fn(),
  lookupGateVerdict: vi.fn(),
  isValidGateCheck: vi.fn(),
  rankAlternatives: vi.fn(),
  publicDb: vi.fn(),
  getActiveRuleCatalog: vi.fn(),
  getPublicStatus: vi.fn(),
}));

vi.mock("@/lib/productData", () => ({ getBadgeDecision, getExtensionProduct, getPublicAnalysisHistory, getPublicInventory, getVersionProduct, getVersionScanProduct, listCatalog }));
vi.mock("@/lib/gateLookup", () => ({ lookupGateVerdict, isValidGateCheck }));
vi.mock("@/lib/alternatives", () => ({ rankAlternatives }));
vi.mock("@/lib/supabase", () => ({ publicDb }));
vi.mock("@/lib/trustTiers", () => ({ deriveTrustTier: vi.fn(() => ({ tier: "verified", summary: "Verified" })) }));
vi.mock("@/lib/activeRuleCatalog", () => ({ getActiveRuleCatalog }));
vi.mock("@/lib/publicStatus", () => ({ getPublicStatus }));

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
      expect.objectContaining({ name: "search_vscode_extensions", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_extension_release", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_extension_release_evidence", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "list_published_extension_scans", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_guardrails_analysis_rules", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_workspace_extension_inventory", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_workspace_capability_graph", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_workspace_policy_bundle", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
      expect.objectContaining({ name: "get_workspace_security_posture", annotations: expect.objectContaining({ readOnlyHint: true }), outputSchema: expect.any(Object) }),
    ]));
  });

  it("publishes public product resources and guided review prompts", async () => {
    const resourcesResponse = await POST(request({ jsonrpc: "2.0", id: 1, method: "resources/list" }));
    const resources = await resourcesResponse.json();
    expect(resources.result.resources).toEqual(expect.arrayContaining([
      expect.objectContaining({ uri: "guardrails://product/overview", mimeType: "text/markdown" }),
      expect.objectContaining({ uri: "guardrails://analysis/evidence-boundary" }),
    ]));

    const readResponse = await POST(request({ jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: "guardrails://analysis/evidence-boundary" } }));
    await expect(readResponse.json()).resolves.toMatchObject({ result: { contents: [expect.objectContaining({ text: expect.stringContaining("unreviewed") })] } });

    const promptResponse = await POST(request({ jsonrpc: "2.0", id: 3, method: "prompts/get", params: { name: "review_vscode_extension", arguments: { extension: "ms-python.python", version: "1.2.3" } } }));
    await expect(promptResponse.json()).resolves.toMatchObject({ result: { messages: [expect.objectContaining({ content: expect.objectContaining({ text: expect.stringContaining("ms-python.python version 1.2.3") }) })] } });
  });

  it("challenges unauthenticated workspace calls with protected-resource metadata", async () => {
    const response = await POST(request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_workspace_extension_inventory", arguments: { workspace_id: "workspace-id" } } }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("oauth-protected-resource/api/mcp");
    expect(response.headers.get("www-authenticate")).toContain("workspace:read");
  });

  it("serves the full public extension-analysis surface through structured tools", async () => {
    listCatalog.mockResolvedValue([{ id: "ms-python.python", display_name: "Python", publisher: "Microsoft", publisher_verified: true }]);
    const response = await POST(request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_vscode_extensions", arguments: { query: "python" } } }));
    const body = await response.json();
    expect(body.result.structuredContent).toMatchObject({ query: "python", extensions: [expect.objectContaining({ extension: "ms-python.python" })] });
  });

  it("returns an exact-release evidence receipt without turning an unreviewed release into approval", async () => {
    isValidGateCheck.mockReturnValue(true);
    getVersionProduct.mockResolvedValue({
      version: { version: "1.2.3" },
      scan: { id: "scan-1", artifact_sha256: "a".repeat(64), scanner_build: "build-1", ruleset_version: "rules-1", scanned_at: "2026-10-21T00:00:00.000Z", analysis_status: "complete", coverage_percent: 100, decision: "allow", severity: "INFO", public_outcome: "clear", evidence_confidence: "high", decision_reason: "Complete analysis." },
    });
    getVersionScanProduct.mockResolvedValue({ scan: { artifact_inventory: { extension_relationship_inventory: {
      entries: [{ extension_id: "ms-vscode.cpptools", relationship: "extensionPack" }],
      resolution: [{ extension_id: "ms-vscode.cpptools", relationship: "extensionPack", status: "scanned", resolved_version: "1.2.3", resolved_artifact_sha256: "b".repeat(64) }],
    } } } });
    const analyzed = await POST(request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_extension_release_evidence", arguments: { extension: "ms-python.python", version: "1.2.3" } } }));
    await expect(analyzed.json()).resolves.toMatchObject({ result: { structuredContent: { analysis_state: "analyzed", artifact: { sha256: "a".repeat(64) }, assessment: { decision: "allow", coverage_percent: 100 }, relationship_context: { status: "reported", relationships: [expect.objectContaining({ extension: "ms-vscode.cpptools", status: "scanned", resolved_version: "1.2.3" })] }, decision_boundary: expect.stringContaining("future releases") } } });

    getVersionProduct.mockResolvedValue({ version: { version: "1.2.4" }, scan: null });
    const unreviewed = await POST(request({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_extension_release_evidence", arguments: { extension: "ms-python.python", version: "1.2.4" } } }));
    await expect(unreviewed.json()).resolves.toMatchObject({ result: { structuredContent: { analysis_state: "unreviewed", assessment: null, decision_boundary: expect.stringContaining("not approval") } } });
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
