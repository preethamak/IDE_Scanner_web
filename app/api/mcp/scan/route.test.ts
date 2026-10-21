import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  localScannerEnabled: vi.fn(),
  runPythonBridge: vi.fn(),
  dispatchGithubMcpScan: vi.fn(),
  getGithubMcpScan: vi.fn(),
  githubMcpScanConfigured: vi.fn(),
  isGithubMcpScanRequestId: vi.fn(),
  runtimeEnv: vi.fn(),
}));

vi.mock("@/lib/pythonBridge", () => ({ localScannerEnabled: mocks.localScannerEnabled, runPythonBridge: mocks.runPythonBridge }));
vi.mock("@/lib/githubMcpScan", () => ({
  dispatchGithubMcpScan: mocks.dispatchGithubMcpScan,
  getGithubMcpScan: mocks.getGithubMcpScan,
  githubMcpScanConfigured: mocks.githubMcpScanConfigured,
  isGithubMcpScanRequestId: mocks.isGithubMcpScanRequestId,
}));
vi.mock("@/lib/runtimeEnv", () => ({ runtimeEnv: mocks.runtimeEnv }));

import { GET, POST } from "./route";

describe("MCP assessment route error boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtimeEnv.mockReturnValue("");
    mocks.localScannerEnabled.mockReturnValue(false);
    mocks.githubMcpScanConfigured.mockReturnValue(true);
    mocks.isGithubMcpScanRequestId.mockReturnValue(true);
  });

  it("rejects malformed async request IDs before runner lookup", async () => {
    mocks.isGithubMcpScanRequestId.mockReturnValue(false);
    const response = await GET(new Request("https://abscissa.dev/api/mcp/scan?request_id=bad"));
    expect(response.status).toBe(400);
    expect(mocks.getGithubMcpScan).not.toHaveBeenCalled();
  });

  it("does not leak runner errors to callers", async () => {
    mocks.getGithubMcpScan.mockRejectedValue(new Error("token for internal runner is invalid"));
    const response = await GET(new Request("https://abscissa.dev/api/mcp/scan?request_id=mcp-00000000-0000-0000-0000-000000000000"));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "MCP assessment status is temporarily unavailable." });
  });

  it("does not leak assessment backend errors to callers", async () => {
    mocks.dispatchGithubMcpScan.mockRejectedValue(new Error("internal repository details"));
    const response = await POST(new Request("https://abscissa.dev/api/mcp/scan", { method: "POST", body: JSON.stringify({ server: { name: "example" } }) }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "MCP assessment is temporarily unavailable. Try again shortly." });
  });
});
