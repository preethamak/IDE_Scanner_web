import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("publisher discovery surface", () => {
  it("keeps popularity and verification separate from safety", () => {
    const page = read("./[publisher]/page.tsx");
    expect(page).toContain("Publisher verification confirms marketplace identity—not extension safety.");
    expect(page).toContain("Popularity helps discovery. It never replaces exact-package analysis.");
    expect(page).toContain("#{index + 1} by installs");
  });

  it("links extension search results to publisher profiles", () => {
    const search = read("../ExtensionSearch.tsx");
    expect(search).toContain("matching_publishers");
    expect(search).toContain("/publishers/");
    expect(search).toContain("rating_average");
  });
});
