import { describe, expect, it } from "vitest";
import { groupDecisionQueue } from "@/lib/teamDecisionQueue";

describe("groupDecisionQueue", () => {
  it("groups resolved, due-soon, and open decisions deterministically", () => {
    const queue = groupDecisionQueue([
      { id: "1", scan_id: "scan-1", decision: "review", extension_id: "a.b", version: "1", due_at: "2026-08-02T00:00:00.000Z", resolved_at: null, updated_at: "2026-07-30T00:00:00.000Z" },
      { id: "2", scan_id: "scan-2", decision: "allow", extension_id: "a.b", version: "2", due_at: null, resolved_at: "2026-07-30T00:00:00.000Z", updated_at: "2026-07-30T00:00:00.000Z" },
      { id: "3", scan_id: "scan-3", decision: "review", extension_id: "a.b", version: "3", due_at: null, resolved_at: null, updated_at: "2026-07-30T00:00:00.000Z" },
    ], new Date("2026-07-30T00:00:00.000Z"));
    expect(queue.dueSoon.map((item) => item.id)).toEqual(["1"]);
    expect(queue.resolved.map((item) => item.id)).toEqual(["2"]);
    expect(queue.open.map((item) => item.id)).toEqual(["3"]);
  });
});
