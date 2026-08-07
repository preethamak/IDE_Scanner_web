import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260806150000_manage_team_member_safely.sql"),
  "utf8",
);

describe("atomic team membership policy", () => {
  it("serializes mutations and protects the final owner", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("owner_count <= 1");
    expect(migration).toContain("The final workspace owner cannot be removed or demoted.");
  });

  it("keeps administrator privilege boundaries server enforced", () => {
    expect(migration).toContain("actor_role is null");
    expect(migration).toContain("Administrators cannot manage owners or other administrators.");
    expect(migration).toContain("grant execute on function public.manage_team_member");
    expect(migration).toContain("to service_role");
  });
});
