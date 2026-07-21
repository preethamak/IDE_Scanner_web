import { beforeEach, describe, expect, it, vi } from "vitest";

const { saveAgentReport, agentReportToJob } = vi.hoisted(() => ({
  saveAgentReport: vi.fn(),
  agentReportToJob: vi.fn(() => ({ id: "job" })),
}));
vi.mock("@/lib/agentReports", () => ({ saveAgentReport, agentReportToJob }));
import { POST } from "./route";

function request(headers: Record<string, string>, body: string) {
  return new Request("http://localhost/api/agent/reports", { method: "POST", headers, body });
}

describe("agent report ingestion endpoint", () => {
  beforeEach(() => {
    delete process.env.IDE_SCANNER_AGENT_TOKEN;
    saveAgentReport.mockReset();
    agentReportToJob.mockClear();
  });

  it("fails closed when no ingestion token is configured", async () => {
    const response = await POST(request({ "Content-Type": "application/json" }, "{}"));
    expect(response.status).toBe(503);
    expect(saveAgentReport).not.toHaveBeenCalled();
  });

  it("rejects a missing or wrong bearer token", async () => {
    process.env.IDE_SCANNER_AGENT_TOKEN = "secret";
    const response = await POST(request({ Authorization: "Bearer wrong" }, "{}"));
    expect(response.status).toBe(401);
    expect(saveAgentReport).not.toHaveBeenCalled();
  });

  it("rejects an oversized payload before parsing", async () => {
    process.env.IDE_SCANNER_AGENT_TOKEN = "secret";
    const big = "x".repeat(9 * 1024 * 1024);
    const response = await POST(request({ Authorization: "Bearer secret", "Content-Type": "application/json" }, big));
    expect(response.status).toBe(413);
    expect(saveAgentReport).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with a 400", async () => {
    process.env.IDE_SCANNER_AGENT_TOKEN = "secret";
    const response = await POST(request({ Authorization: "Bearer secret" }, "{ not json"));
    expect(response.status).toBe(400);
    expect(saveAgentReport).not.toHaveBeenCalled();
  });

  it("accepts an authorized well-formed report", async () => {
    process.env.IDE_SCANNER_AGENT_TOKEN = "secret";
    saveAgentReport.mockResolvedValue({ id: "report" });
    const response = await POST(request({ Authorization: "Bearer secret" }, JSON.stringify({ ok: true })));
    expect(response.status).toBe(201);
    expect(saveAgentReport).toHaveBeenCalledWith({ ok: true });
  });
});
