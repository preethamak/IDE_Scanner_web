import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/authError";

describe("authErrorMessage", () => {
  it("turns opaque email-delivery failures into a useful recovery message", () => {
    expect(authErrorMessage({ code: "unexpected_failure", message: "Error sending magic link email" })).toMatch(/could not send a sign-in code/i);
    expect(authErrorMessage({})).toMatch(/could not send a sign-in code/i);
  });

  it("keeps a useful authentication error message", () => {
    expect(authErrorMessage({ message: "That code is invalid or expired." })).toBe("That code is invalid or expired.");
  });
});
