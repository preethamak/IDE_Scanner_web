import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountPage = readFileSync(new URL("../app/account/page.tsx", import.meta.url), "utf8");

describe("passwordless account surface", () => {
  it("only exposes passwordless providers and sends an email sign-in link", () => {
    expect(accountPage).toContain("sendEmailLink");
    expect(accountPage).toContain("/api/auth/email/request");
    expect(accountPage).toContain("Email me a secure link");
    expect(accountPage).toContain('oauth("github")');
    expect(accountPage).toContain('oauth("google")');
    expect(accountPage).not.toMatch(/signInWithPassword\s*\(/);
    expect(accountPage).not.toMatch(/\.signUp\s*\(/);
  });
});
