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
    expect(source).toContain("event_id: event.data.id");
    expect(source).toContain("actor_id: user.id");
    expect(source).toContain("kind: eventKind");
    expect(source).toContain("recorded_at:");
  });
});
