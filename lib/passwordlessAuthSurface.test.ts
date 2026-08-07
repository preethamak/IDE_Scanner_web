import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountPage = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");

describe("passwordless account surface", () => {
  it("only exposes passwordless providers and preserves the email callback", () => {
    expect(accountPage).toMatch(
      /signInWithOtp\(\{\s*email:\s*address,\s*options:\s*\{\s*shouldCreateUser:\s*true,\s*emailRedirectTo:\s*callbackUrl\(\)\s*\},?\s*\}\)/,
    );
    expect(accountPage).toContain('oauth("github")');
    expect(accountPage).toContain('oauth("google")');
    expect(accountPage).not.toMatch(/signInWithPassword\s*\(/);
    expect(accountPage).not.toMatch(/\.signUp\s*\(/);
  });
});
