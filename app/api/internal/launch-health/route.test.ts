import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/publicationHealth", () => ({ getPublicationHealth: vi.fn().mockResolvedValue({ healthy: true, reasons: [], active_release: null, current_report_count: 1, newest_scan_at: new Date().toISOString(), runner_status: "available", runner_last_seen_at: new Date().toISOString(), scan_failure_rate: 0, notification_failure_rate: 0 }) }));
import { GET } from "./route";

const previous = process.env.LAUNCH_HEALTH_SECRET;
afterEach(() => { if (previous === undefined) delete process.env.LAUNCH_HEALTH_SECRET; else process.env.LAUNCH_HEALTH_SECRET = previous; });

describe("launch health authorization", () => {
  it("accepts the bearer credential and the protected automation header", async () => {
    process.env.LAUNCH_HEALTH_SECRET = "health-secret";
    await expect(GET(new Request("http://localhost", { headers: { Authorization: "Bearer health-secret" } })).then((response) => response.status)).resolves.toBe(200);
    await expect(GET(new Request("http://localhost", { headers: { "x-guardrails-health-token": "health-secret" } })).then((response) => response.status)).resolves.toBe(200);
  });
  it("rejects a missing or mismatched credential", async () => {
    process.env.LAUNCH_HEALTH_SECRET = "health-secret";
    await expect(GET(new Request("http://localhost")).then((response) => response.status)).resolves.toBe(401);
    await expect(GET(new Request("http://localhost", { headers: { "x-guardrails-health-token": "wrong-secret" } })).then((response) => response.status)).resolves.toBe(401);
  });
});
