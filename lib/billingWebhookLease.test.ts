import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260809100000_recover_billing_webhook_leases.sql",
  ),
  "utf8",
);

describe("billing webhook processing leases", () => {
  it("distinguishes completed, live, failed, and abandoned deliveries", () => {
    expect(migration).toContain("returns text");
    expect(migration).toContain("return 'processed'");
    expect(migration).toContain("return 'busy'");
    expect(migration).toContain("interval '10 minutes'");
    expect(migration).toContain("attempts = attempts + 1");
  });

  it("keeps claim and completion restricted to the service role", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("processing_started_at = null");
  });
});
