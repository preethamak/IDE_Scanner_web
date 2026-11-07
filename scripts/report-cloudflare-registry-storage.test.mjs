import { describe, expect, it, vi } from "vitest";
import { readQueryResults, registryStorageQueries, reportRegistryStorage, summarizeReportParity, invalidWorkspaceQuery, runWranglerQuery } from "./report-cloudflare-registry-storage.mjs";

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
    const runQuery = vi.fn(async (sql) => JSON.stringify([{ success: true, results: sql === invalidWorkspaceQuery ? [{ invalid_rows: 0 }] : sql.startsWith('SELECT COUNT(*) AS total FROM (') ? [{ total: 0 }] : sql.startsWith('SELECT * FROM (') ? [] : [{ rows: 3, payload_bytes: 100 }] }]));
    const output = await reportRegistryStorage({ accountId: "a".repeat(32), databaseId: "00000000-0000-4000-8000-000000000000", scanDatabaseId: "11111111-1111-4111-8111-111111111111", token: "private", fetchImpl, runQuery });
    expect(output.file_size_bytes).toBe(12345);
    expect(output.scan_data_file_size_bytes).toBe(12345);
    expect(Object.keys(output.aggregates)).toEqual(Object.keys(registryStorageQueries));
    expect(JSON.stringify(output)).not.toContain("private");
    expect(runQuery).toHaveBeenCalledTimes(Object.keys(registryStorageQueries).length + 14);
  });

  it("fails closed when metadata or SQL results are unavailable", async () => {
    expect(() => readQueryResults('[{"success":false,"results":[]}]')).toThrow();
    expect(() => readQueryResults('private-scan-id is not JSON')).toThrow('D1 storage query returned invalid JSON.');
    await expect(reportRegistryStorage({ accountId: "a".repeat(32), databaseId: "00000000-0000-4000-8000-000000000000", scanDatabaseId: "11111111-1111-4111-8111-111111111111", token: "x", fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, result: {} }) }), runQuery: vi.fn() })).rejects.toThrow("database size");
  });

  it("sanitizes process errors and rejects a truncated page", async () => {
    expect(() => runWranglerQuery('select', 'db', () => { throw new Error('private-scan-id'); })).toThrow('Cloudflare storage query failed; no results were reported.');
    const fetchImpl = async () => ({ ok: true, json: async () => ({ success: true, result: { file_size: 1 } }) });
    const runQuery = async (sql) => JSON.stringify([{ success: true, results: sql.startsWith('SELECT COUNT(*) AS total FROM (') ? [{ total: 1 }] : sql.startsWith('SELECT * FROM (') ? [] : [{ rows: 0 }] }]);
    await expect(reportRegistryStorage({ accountId: 'a'.repeat(32), databaseId: '0'.repeat(36), scanDatabaseId: '1'.repeat(36), token: 'x', fetchImpl, runQuery })).rejects.toThrow('incomplete');
  });

  it("counts overlapping protections once and distinguishes matching, conflicting, and missing records without disclosing identifiers", () => {
    const base = { scan_id: "private-scan-a", job_id: "private-job", extension_id: "publisher.extension", version: "1.0", artifact_sha256: "a".repeat(64), payload_bytes: 123, storage_mode: "inline_or_other", purpose: "user_request", in_active_publication: 1, in_other_publication: 1, has_requester: 1, has_subscribers: 1, has_guest_access: 1 };
    const source = [base, { ...base, scan_id: "private-scan-b" }, { ...base, scan_id: "private-scan-c" }];
    const destination = [{ ...base }, { ...base, scan_id: "private-scan-b", version: "2.0" }];
    const result = summarizeReportParity(source, destination, [{ scan_id: "private-scan-a" }], [{ scan_id: "private-scan-a" }, { scan_id: "private-scan-b" }]);
    expect(result.reports).toBe(3);
    expect(result.groups.reduce((sum, group) => sum + group.reports, 0)).toBe(3);
    expect(result.groups).toEqual(expect.arrayContaining([
      expect.objectContaining({ destination_identity: "identity_match_only", known_team_reference: true, active_publication: true, subscribers: true, reports: 1 }),
      expect.objectContaining({ destination_identity: "identity_conflict", known_team_reference: true, reports: 1 }),
      expect.objectContaining({ destination_identity: "missing", known_team_reference: false, reports: 1 }),
    ]));
    expect(JSON.stringify(result)).not.toContain("private-scan");
    expect(JSON.stringify(result)).not.toContain("publisher.extension");
    expect(result.verification).toContain("payloads");
  });
});
