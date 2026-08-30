import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
const workbench = read("./GuardRailsWorkbench.tsx");
const navigation = read("../SiteNav.tsx");

describe("GuardRails IDE control plane", () => {
  it("keeps the browser/native enforcement boundary explicit", () => {
    expect(workbench).toContain("Browser prototype—not an OS sandbox");
    expect(workbench).toContain("does not isolate local processes");
    expect(workbench).not.toContain("Sandbox policy active");
    expect(workbench).not.toContain("GuardRails protected");
  });

  it("offers principal, resource, duration, revocation, and audit controls", () => {
    for (const phrase of ["Review agent", "TypeScript tools", "GitHub review tool", "Once", "This session", "Workspace", "Add scoped grant", "Simulate request", "Revoke", "Audit timeline"]) expect(workbench).toContain(phrase);
  });

  it("demonstrates secret-safe broker receipts and versioned policy templates", () => {
    for (const phrase of ["Filesystem broker", "Network broker", "Command broker", "Credential broker", "Opaque handle + destination binding", "Read-only workspace", "Patch review", "Package audit", "Policy templates"]) expect(workbench).toContain(phrase);
  });

  it("keeps a small top row with everything secondary in one grouped menu", () => {
    for (const phrase of ["Registry", "Docs", "Pricing", "Product", "Solutions", "Team Workspace", "Engineering teams", "AI-agent security"]) expect(navigation).toContain(phrase);
  });
});
