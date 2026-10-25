import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { seoGuides } from "@/lib/seoGuides";
import { metadata as workspaceMetadata } from "./workspace/layout";
import { generateMetadata } from "./guides/[slug]/page";

describe("search discovery", () => {
  it("lists every guide exactly once and excludes the private workspace", () => {
    const entries = sitemap();
    const urls = entries.map(entry => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).not.toContain("https://abscissa.dev/workspace");
    expect(workspaceMetadata.robots).toMatchObject({ index: false });
    for (const { slug } of seoGuides) expect(urls.filter(url => url === `https://abscissa.dev/guides/${slug}`)).toHaveLength(1);
    expect(entries.every(entry => entry.lastModified === undefined)).toBe(true);
  });
  it("gives each generated guide its own canonical and social URL", async () => {
    for (const { slug } of seoGuides) {
      const params = { slug };
      const metadata = await generateMetadata({ params: Promise.resolve(params) });
      expect(metadata.alternates?.canonical).toBe(`/guides/${params.slug}`);
      expect(metadata.openGraph?.url).toBe(`/guides/${params.slug}`);
      expect(metadata.description).toBeTruthy();
    }
    expect((await generateMetadata({ params: Promise.resolve({ slug: "missing" }) })).robots).toMatchObject({ index: false });
  });
});
