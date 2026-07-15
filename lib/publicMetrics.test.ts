import { describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const select = vi.fn();
vi.mock("@/lib/supabase", () => ({ publicDb: () => ({ rpc, from: () => ({ select }) }) }));
import { getPublicMetrics } from "./publicMetrics";

describe("public intelligence metrics", () => {
  it("does not invent metrics when the aggregate function is unavailable", async () => {
    rpc.mockResolvedValue({ error: new Error("migration pending"), data: null });
    select.mockReturnValue({ eq: () => ({ order: () => ({ limit: async () => ({ data: [] }) }) }) });
    expect((await getPublicMetrics()).exact_releases_analyzed).toBeNull();
  });

  it("publishes distinct aggregate counts and waits for a latency denominator", async () => {
    rpc.mockResolvedValue({ error: null, data: [{ indexed_extensions: 7, exact_releases_indexed: 12, exact_releases_analyzed: 10, analyzer_complete_reports: 9, known_bad_artifacts: 1, block_decisions: 1, high_risk_reviews: 2, latency_sample_size: 19, median_minutes: 4, p95_minutes: 20 }] });
    select.mockReturnValue({ eq: () => ({ order: () => ({ limit: async () => ({ data: [{ registry: "vs-marketplace", completed_at: "2026-07-15T00:00:00Z" }] }) }) }) });
    const metrics = await getPublicMetrics();
    expect(metrics).toMatchObject({ indexed_extensions: 7, exact_releases_analyzed: 10, known_bad_artifacts: 1 });
    expect(metrics.time_to_analysis.status).toBe("not_measured");
  });
});
