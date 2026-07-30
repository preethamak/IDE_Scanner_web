import { describe, expect, it } from "vitest";
import { decisionEventKind, type DecisionSnapshot } from "@/lib/teamDecisionLifecycle";

const open: DecisionSnapshot = { decision: "review", rationale: "", assigned_to: null, due_at: null, resolved_at: null };

describe("decisionEventKind", () => {
  it("records the first saved decision as created", () => expect(decisionEventKind(null, open)).toBe("created"));
  it("records ownership changes separately", () => expect(decisionEventKind(open, { ...open, assigned_to: "user-1" })).toBe("assigned"));
  it("records resolution and reopening transitions", () => {
    const resolved = { ...open, decision: "allow" as const, resolved_at: "2026-07-30T00:00:00.000Z" };
    expect(decisionEventKind(open, resolved)).toBe("resolved");
    expect(decisionEventKind(resolved, open)).toBe("reopened");
  });
});
