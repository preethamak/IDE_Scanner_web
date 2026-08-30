import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("feedback surface", () => {
  it("keeps the global feedback launcher in the root chrome", () => {
    const layout = read("./layout.tsx");
    const widget = read("./FeedbackWidget.tsx");
    const contract = read("../lib/feedback.ts");
    expect(layout).toContain("<FeedbackWidget />");
    expect(widget).toContain('fetch("/api/feedback"');
    expect(widget).toContain("Please do not include passwords, tokens, or private source code.");
    expect(contract).toContain('"report_clarity"');
  });

  it("keeps the feedback dialog responsive and keyboard dismissible", () => {
    const widget = read("./FeedbackWidget.tsx");
    const css = read("./companyChrome.module.css");
    expect(widget).toContain('event.key === "Escape"');
    expect(widget).toContain('role="dialog"');
    expect(css).toContain("max-height: min(760px, calc(100vh - 48px))");
  });
});
