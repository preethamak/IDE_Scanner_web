import { describe, expect, it } from "vitest";
import { isEmailOtp, normalizeEmail, normalizeEmailOtp } from "@/lib/emailOtp";

describe("email OTP helpers", () => {
  it("normalizes an email before it is sent to Auth", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
  });

  it("preserves a configured eight-digit code when pasted", () => {
    expect(normalizeEmailOtp("12 34-5678")).toBe("12345678");
  });

  it("limits pasted input to Supabase's supported maximum", () => {
    expect(normalizeEmailOtp("12345678901")).toBe("1234567890");
  });

  it("accepts complete Supabase email OTPs from six through ten digits", () => {
    expect(isEmailOtp("123456")).toBe(true);
    expect(isEmailOtp("12345678")).toBe(true);
    expect(isEmailOtp("1234567890")).toBe(true);
    expect(isEmailOtp("12345")).toBe(false);
    expect(isEmailOtp("12345678901")).toBe(false);
    expect(isEmailOtp("abcdef")).toBe(false);
  });
});
