import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const monitor = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const workspace = readFileSync(
  new URL("../TeamWorkspace.tsx", import.meta.url),
  "utf8",
);

describe("release monitoring surface", () => {
  it("opens authenticated users directly in the monitoring view", () => {
    expect(monitor).toContain(
      '<TeamWorkspace initialExtension={extension} focus="monitor" />',
    );
    expect(workspace).toContain(
      'props.focus === "monitor" ? "extensions" : "overview"',
    );
    expect(monitor).not.toContain(
      '<main className="workspacePage monitorPage"',
    );
  });

  it("provides honest signed-out, loading, and recovery states", () => {
    expect(monitor).toContain("Approve once");
    expect(monitor).toContain("Opening release monitoring");
    expect(monitor).toContain("Monitoring could not be opened");
    expect(monitor).toContain("Public extension reports remain available");
    expect(monitor).toContain("Try again");
  });
});
