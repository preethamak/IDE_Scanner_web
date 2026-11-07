import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: () => ({ env: { ABSCISSA_SCAN_DATA: runtime.db } }) }));
import { getWorkspaceState, saveState } from "@/lib/cloudflareWorkspace";
import { getCloudflareAccessibleScanIdentity } from "@/lib/cloudflareScanAccess";
import { WorkspaceConflictError } from "@/lib/workspaceConflict";
import { saveWorkspaceState } from "@/lib/cloudflarePrivate";
import { reconcileCloudflareBadgeHealth } from "@/lib/cloudflareBadgeHealth";

type Sqlite = { exec(sql: string): void; close(): void; prepare(sql: string): { get(...args: unknown[]): Record<string, unknown> | undefined; all(...args: unknown[]): Record<string, unknown>[]; run(...args: unknown[]): { changes: number } } };
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: new (path: string) => Sqlite };
let sqlite: Sqlite;
function statement(sql: string, values: unknown[] = []) {
  return { bind: (...args: unknown[]) => statement(sql, args), first: async () => sqlite.prepare(sql).get(...values) || null, all: async () => ({ results: sqlite.prepare(sql).all(...values) }), run: async () => ({ success: true, meta: sqlite.prepare(sql).run(...values) }) };
}
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  runtime.db = { prepare: (sql: string) => statement(sql) };
  sqlite.exec(`
    CREATE TABLE app_team_state(team_id TEXT PRIMARY KEY,state_json TEXT,updated_at TEXT);
    INSERT INTO app_team_state VALUES('team-1','{}','before');
    CREATE TABLE app_scan_reports(scan_id TEXT PRIMARY KEY,job_id TEXT,extension_id TEXT,version TEXT,artifact_sha256 TEXT);
    CREATE TABLE app_scan_jobs(id TEXT PRIMARY KEY,status TEXT,scan_purpose TEXT);
    CREATE TABLE app_scan_job_subscribers(job_id TEXT,user_id TEXT);
    CREATE TABLE app_scan_publication_release_reports(release_id TEXT,scan_id TEXT);
    CREATE TABLE app_scan_publication_releases(id TEXT PRIMARY KEY,active INTEGER,accuracy_gate_corpus_id TEXT,accuracy_gate_corpus_version TEXT,accuracy_gate_sha256 TEXT);
    INSERT INTO app_scan_jobs VALUES('private-job','complete','user_request');
    INSERT INTO app_scan_reports VALUES('private-scan','private-job','publisher.private','1.0.0','hash');
    INSERT INTO app_scan_job_subscribers VALUES('private-job','owner-1');
    INSERT INTO app_scan_reports VALUES('public-scan','public-job','publisher.public','2.0.0','hash');
  `);
});
afterEach(() => sqlite.close());

describe("D1 exact scan access", () => {
  it("allows the scan subscriber but refuses an unrelated team reviewer", async () => {
    expect(await getCloudflareAccessibleScanIdentity("private-scan", "owner-1")).toMatchObject({ scan_id: "private-scan" });
    expect(await getCloudflareAccessibleScanIdentity("private-scan", "outsider")).toBeNull();
  });
  it("allows only an active, accuracy-attested public release", async () => {
    sqlite.prepare("INSERT INTO app_scan_publication_releases VALUES(?,1,?,?,?)").run("release", "corpus", "1", "a".repeat(64));
    sqlite.exec("INSERT INTO app_scan_publication_release_reports VALUES('release','public-scan')");
    expect(await getCloudflareAccessibleScanIdentity("public-scan", "outsider")).toMatchObject({ version: "2.0.0" });
    sqlite.exec("UPDATE app_scan_publication_releases SET active=0");
    expect(await getCloudflareAccessibleScanIdentity("public-scan", "outsider")).toBeNull();
    sqlite.exec("UPDATE app_scan_publication_releases SET active=1,accuracy_gate_sha256='not-attested'");
    expect(await getCloudflareAccessibleScanIdentity("public-scan", "outsider")).toBeNull();
  });
});

describe("D1 workspace compare-and-swap", () => {
  it("refuses a stale writer instead of erasing a saved decision and audit receipt", async () => {
    const decisionWriter = await getWorkspaceState("team-1");
    const staleWatchWriter = await getWorkspaceState("team-1");
    decisionWriter.decisions.push({ id: "decision-1", rationale: "Reviewed" });
    decisionWriter.audit.push({ event_id: "event-1", receipt_id: "receipt-1" });
    await saveState("team-1", decisionWriter);
    staleWatchWriter.watchlist.push({ extension_id: "new.watch" });
    await expect(saveState("team-1", staleWatchWriter)).rejects.toBeInstanceOf(WorkspaceConflictError);
    const saved = await getWorkspaceState("team-1");
    expect(saved.decisions[0].id).toBe("decision-1"); expect(saved.audit[0].receipt_id).toBe("receipt-1"); expect(saved.watchlist).toHaveLength(0);
  });
  it("refreshes a writer's snapshot after a successful save", async () => {
    const state = await getWorkspaceState("team-1");
    state.decisions.push({ id: "decision-1" }); await saveState("team-1", state);
    state.decisions.push({ id: "decision-2" }); await saveState("team-1", state);
    expect((await getWorkspaceState("team-1")).decisions).toHaveLength(2);
  });
  it("refuses racing initial creation", async () => {
    await saveWorkspaceState("new-team", { decisions: [{ id: "first" }] }, null);
    await expect(saveWorkspaceState("new-team", { decisions: [] }, null)).rejects.toBeInstanceOf(WorkspaceConflictError);
  });
  it.each(["broken-json", "[]", "null", "123"])("does not replace an invalid workspace document (%s)", async (value) => {
    sqlite.prepare("UPDATE app_team_state SET state_json=? WHERE team_id='team-1'").run(value);
    await expect(getWorkspaceState("team-1")).rejects.toThrow("refusing to replace");
    expect(sqlite.prepare("SELECT state_json FROM app_team_state").get()?.state_json).toBe(value);
  });
  it("does not let a scheduled catalog check overwrite a decision saved during reconciliation", async () => {
    const original = { watchlist: [{ extension_id: "publisher.extension", baseline_version: "1.0.0" }], audit: [], decisions: [], channels: [] };
    sqlite.prepare("UPDATE app_team_state SET state_json=? WHERE team_id='team-1'").run(JSON.stringify(original));
    sqlite.exec("CREATE TABLE app_team_badges(id TEXT,extension_id TEXT,version TEXT,status TEXT,team_id TEXT)");
    let raced = false;
    const db = { prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({
      all: async () => sql.includes("registry_publication_state")
        ? { results: [{ active_publication_id: "active", payload: JSON.stringify([{ id: "publisher.extension", latest_version: "1.1.0" }]) }] }
        : { results: sqlite.prepare(sql).all(...args) },
      first: async () => sqlite.prepare(sql).get(...args) || null,
      run: async () => {
        if (sql.includes("UPDATE app_team_state") && !raced) {
          raced = true;
          sqlite.prepare("UPDATE app_team_state SET state_json=? WHERE team_id='team-1'").run(JSON.stringify({ ...original, decisions: [{ id: "saved-during-check" }], audit: [{ receipt_id: "durable-receipt" }] }));
        }
        return { success: true, meta: sqlite.prepare(sql).run(...args) };
      },
    }) }) } as unknown as D1Database;
    expect(await reconcileCloudflareBadgeHealth(db, "2026-11-07T09:00:00Z")).toMatchObject({ teams_changed: 0, releases_detected: 0 });
    const saved = await getWorkspaceState("team-1");
    expect(saved.decisions[0].id).toBe("saved-during-check"); expect(saved.audit[0].receipt_id).toBe("durable-receipt");
  });
});
