import { describe, expect, it, vi } from "vitest";

const { privateDb } = vi.hoisted(() => ({ privateDb: vi.fn() }));
vi.mock("@/lib/cloudflarePrivate", () => ({ privateDb }));

import { listAgentReports, readAgentReport, saveAgentReport } from "@/lib/agentReports";

function d1(rows: Record<string, unknown>[] = [], chunks: Record<string, unknown>[] = []) {
  const batch = vi.fn().mockResolvedValue([]);
  const prepare = vi.fn((query: string) => {
    const result = {
      first: vi.fn().mockResolvedValue(rows[0] || null),
      all: vi.fn().mockResolvedValue({ results: query.includes("app_agent_report_chunks") ? chunks : rows }),
    };
    return {
      ...result,
      bind: (...values: unknown[]) => ({
        query,
        values,
        run: vi.fn().mockResolvedValue({}),
        ...result,
      }),
    };
  });
  return { prepare, batch };
}

describe("agent report storage", () => {
  it("uses a D1 batch when durable storage is available", async () => {
    const db = d1();
    privateDb.mockReturnValue(db);

    const saved = await saveAgentReport({ agent: { generated_at: 10 }, summary: { total_extensions: 1 }, report: { extensions: [] } });

    expect(saved.id).toMatch(/^agent-/);
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.batch.mock.calls[0][0][0]).toMatchObject({ query: expect.stringContaining("INSERT INTO app_agent_reports") });
  });

  it("chunks oversized D1 reports and reconstructs them only when complete", async () => {
    const report = { extensions: [{ artifact_inventory: { payload: "x".repeat(100_000) } }] };
    const db = d1();
    privateDb.mockReturnValue(db);
    const saved = await saveAgentReport({ agent: {}, summary: { total_extensions: 1 }, report });
    const statements = db.batch.mock.calls[0][0];
    expect(statements).toHaveLength(3);

    const serialized = JSON.stringify(report);
    const row = {
      id: saved.id,
      created_at: saved.createdAt,
      updated_at: saved.updatedAt,
      agent_json: "{}",
      summary_json: JSON.stringify({ total_extensions: 1 }),
      report_json: JSON.stringify({ storage: "chunked" }),
      report_chunk_count: 2,
    };
    const readDb = d1([row], [
      { chunk_index: 0, content: serialized.slice(0, 100_000) },
      { chunk_index: 1, content: serialized.slice(100_000) },
    ]);
    privateDb.mockReturnValue(readDb);

    await expect(readAgentReport(saved.id)).resolves.toMatchObject({ id: saved.id, report });
    await expect(listAgentReports()).resolves.toHaveLength(1);
  });

  it("rejects incomplete chunk sets instead of returning a partial report", async () => {
    const db = d1([{
      id: "agent-incomplete",
      created_at: 1,
      updated_at: 1,
      agent_json: "{}",
      summary_json: "{}",
      report_json: "{}",
      report_chunk_count: 2,
    }], [{ chunk_index: 0, content: "{}" }]);
    privateDb.mockReturnValue(db);

    await expect(readAgentReport("agent-incomplete")).resolves.toBeNull();
  });
});
