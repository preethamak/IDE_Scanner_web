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

  it("keeps the stored submissions private and server-mediated", () => {
    const migration = readFileSync(
      new URL("../supabase/migrations/20260830143000_feedback_submissions.sql", import.meta.url),
      "utf8",
    );
    const route = read("./api/feedback/route.ts");
    expect(migration).toContain("alter table public.feedback_submissions enable row level security");
    expect(migration).toContain("revoke all on public.feedback_submissions from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.submit_feedback");
    expect(migration).toContain("p_category is null or p_category not in");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(route).toContain('db.rpc("submit_feedback"');
  });
});
