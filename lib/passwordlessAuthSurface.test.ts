import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountPage = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");

describe("passwordless account surface", () => {
  it("only exposes passwordless providers and preserves the email callback", () => {
    expect(accountPage).toContain('signInWithOtp({ email: address, options: { shouldCreateUser: true, emailRedirectTo: callbackUrl() } })');
    expect(accountPage).toContain('oauth("github")');
    expect(accountPage).toContain('oauth("google")');
    expect(accountPage).not.toMatch(/signInWithPassword\s*\(/);
    expect(accountPage).not.toMatch(/\.signUp\s*\(/);
  });
});
