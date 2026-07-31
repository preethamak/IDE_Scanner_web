import { describe, expect, it } from "vitest";
import { isEmailOtp, normalizeEmail, normalizeEmailOtp } from "@/lib/emailOtp";

describe("email OTP helpers", () => {
  it("normalizes an email before it is sent to Auth", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
  });

  it("keeps only six digits when a code is pasted", () => {
    expect(normalizeEmailOtp("12 3-4567")).toBe("123456");
  });

  it("accepts only a complete six-digit code", () => {
    expect(isEmailOtp("123456")).toBe(true);
    expect(isEmailOtp("12345")).toBe(false);
    expect(isEmailOtp("abcdef")).toBe(false);
  });
});
