import { describe, expect, it } from "vitest";
import { validBearerSecret } from "./internalRunnerAuth";

describe("shared bearer authentication", () => {
  it("accepts the case-insensitive HTTP bearer scheme without relaxing the secret check", () => {
    expect(validBearerSecret("Bearer expected-secret", "expected-secret")).toBe(true);
    expect(validBearerSecret("bearer expected-secret", "expected-secret")).toBe(true);
    expect(validBearerSecret("BEARER expected-secret", "expected-secret")).toBe(true);
    expect(validBearerSecret("Bearer wrong-secret", "expected-secret")).toBe(false);
    expect(validBearerSecret("Basic expected-secret", "expected-secret")).toBe(false);
  });
});
