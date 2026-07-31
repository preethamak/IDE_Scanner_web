import { describe, expect, it, vi } from "vitest";
import { queueDecisionDueAlerts } from "@/app/api/cron/notifications/route";

describe("decision-due notification scheduling", () => {
  it("calls the privileged, idempotent queue function with the scheduler time", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });
    await expect(queueDecisionDueAlerts({ rpc } as never, "2026-07-31T12:00:00.000Z")).resolves.toEqual({ queued: 2, error: "" });
    expect(rpc).toHaveBeenCalledWith("queue_team_decision_due_alerts", { target_now: "2026-07-31T12:00:00.000Z" });
  });

  it("does not continue silently when decision alert scheduling fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    await expect(queueDecisionDueAlerts({ rpc } as never, "2026-07-31T12:00:00.000Z")).resolves.toEqual({ queued: 0, error: "database unavailable" });
  });
});
