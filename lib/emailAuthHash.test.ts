import { afterEach, expect, it, vi } from "vitest";
import { codeHash } from "./emailAuthHash";
afterEach(() => vi.unstubAllEnvs());
it("preserves email-token hashing when the helper is imported outside a route", () => {
  vi.stubEnv("MONITORING_ENCRYPTION_KEY", "example-private-key");
  expect(codeHash("person@example.test", "code")).toMatch(/^[a-f0-9]{64}$/);
  expect(codeHash("person@example.test", "code")).not.toBe(codeHash("other@example.test", "code"));
  expect(codeHash("person@example.test", "code")).not.toBe(codeHash("person@example.test", "other"));
});
