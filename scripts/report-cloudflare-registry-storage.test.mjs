import { describe, expect, it, vi } from "vitest";
import { readQueryResults, registryStorageQueries, reportRegistryStorage } from "./report-cloudflare-registry-storage.mjs";

describe("registry storage report", () => {
  it("uses read-only aggregate queries and labels non-active data as possibly staged", () => {
    for (const sql of Object.values(registryStorageQueries)) {
      expect(sql.trim()).toMatch(/^SELECT\b/i);
      expect(sql).not.toMatch(/\b(DELETE|UPDATE|INSERT|DROP|ALTER|REPLACE|VACUUM)\b/i);
    }
    expect(registryStorageQueries.product_chunks).toContain("other_or_staged");
  });

  it("returns only size and aggregate rows after successful metadata and queries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, result: { file_size: 12345, name: "ignored" } }) });
    const runQuery = vi.fn().mockResolvedValue(JSON.stringify([{ success: true, results: [{ rows: 3, payload_bytes: 100 }] }]));
    const output = await reportRegistryStorage({ accountId: "a".repeat(32), databaseId: "00000000-0000-4000-8000-000000000000", token: "private", fetchImpl, runQuery });
    expect(output.file_size_bytes).toBe(12345);
    expect(Object.keys(output.aggregates)).toEqual(Object.keys(registryStorageQueries));
    expect(JSON.stringify(output)).not.toContain("private");
    expect(runQuery).toHaveBeenCalledTimes(Object.keys(registryStorageQueries).length);
  });

  it("fails closed when metadata or SQL results are unavailable", async () => {
    expect(() => readQueryResults('[{"success":false,"results":[]}]')).toThrow();
    await expect(reportRegistryStorage({ accountId: "a".repeat(32), databaseId: "00000000-0000-4000-8000-000000000000", token: "x", fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, result: {} }) }), runQuery: vi.fn() })).rejects.toThrow("database size");
  });
});
