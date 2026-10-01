import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(new URL("../TeamWorkspace.tsx", import.meta.url), "utf8");
const panel = readFileSync(new URL("./TrustLedgerPanel.tsx", import.meta.url), "utf8");

describe("artifact trust ledger workspace surface", () => {
  it("makes exact artifact control a first-class workspace destination", () => {
    expect(workspace).toContain('["trust", "Trust ledger", KeyRound]');
    expect(workspace).toContain("<TrustLedgerPanel");
    expect(workspace).toContain('view === "trust"');
  });

  it("requires a completed scan and explains uncertain inventory impact", () => {
    expect(panel).toContain("Approve from a completed scan");
    expect(panel).toContain("A pasted hash cannot create an approval");
    expect(panel).toContain("Version matched, hash missing");
    expect(panel).toContain("Open recall");
  });
});
