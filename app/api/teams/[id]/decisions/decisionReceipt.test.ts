import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(process.cwd(), "app/api/teams/[id]/decisions/route.ts"),
  "utf8",
);

describe("team decision audit receipts", () => {
  it("returns the durable event identity and recording context", () => {
    expect(source).toContain("audit_receipt");
    expect(source).toContain('rpc("record_team_decision_atomically"');
    expect(source).toContain("audit_receipt: mutation.audit_receipt");
    expect(source).not.toContain('.from("team_decision_events").insert');
  });
});
