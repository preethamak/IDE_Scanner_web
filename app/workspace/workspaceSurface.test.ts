import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const workspace = fs.readFileSync(path.join(root, "app/TeamWorkspace.tsx"), "utf8");
const page = fs.readFileSync(path.join(root, "app/workspace/page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/workspace/teamWorkspace.module.css"), "utf8");

describe("GuardRails workspace product surface", () => {
  it("provides a persistent product navigation and account controls", () => {
    for (const label of ["Overview", "Review inbox", "Extensions", "Decisions", "Activity", "Settings", "Sign out"]) {
      expect(workspace).toContain(label);
    }
  });

  it("uses an accessible custom workspace switcher instead of a native overlay select", () => {
    expect(workspace).toContain('aria-haspopup="listbox"');
    expect(workspace).toContain('role="option"');
    expect(workspace).not.toContain('<select aria-label="Switch workspace"');
  });

  it("gives first-time users a guided activation step", () => {
    expect(workspace).toContain("Step 1 of 3");
    expect(workspace).toContain("Build your security workspace.");
    expect(workspace).toContain("Exact release baselines");
  });

  it("makes monitoring health and the review queue visible", () => {
    for (const copy of ["Needs review", "Overdue", "Monitoring", "Workspace health", "Needs attention", "Monitoring health"]) {
      expect(workspace).toContain(copy);
    }
  });

  it("clears data before a workspace switch refresh", () => {
    expect(workspace).toContain('setAlerts([]); setDecisions([]); setMembers([]); setWatchItems([])');
    expect(workspace).toContain('setDataState("error")');
  });

  it("has explicit decision persistence feedback", () => {
    expect(workspace).toContain("Recording decision…");
    expect(workspace).toContain("Decision recorded and added to the audit trail.");
    expect(workspace).toContain("Decision could not be saved. Try again.");
  });

  it("uses route-scoped styling and responsive product layouts", () => {
    expect(page).toContain('import styles from "./workspace.module.css"');
    expect(workspace).toContain('teamWorkspace.module.css');
    expect(css).toContain("@media(max-width:760px)");
    expect(css).toContain(".sidebarOpen");
  });
});
