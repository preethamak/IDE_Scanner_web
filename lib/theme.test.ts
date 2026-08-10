import { describe, expect, it } from "vitest";
import { isThemePreference, resolveTheme } from "./theme";

describe("theme contract", () => {
  it("accepts only supported persisted preferences", () => {
    expect(["light", "dark", "system"].every(isThemePreference)).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
  });

  it("resolves system while preserving explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
