import type { MetadataRoute } from "next";
import { researchArticles } from "@/lib/research";

const BASE_URL = "https://abscissa.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: Array<[string, number, MetadataRoute.Sitemap[number]["changeFrequency"]]> = [
    ["/", 1, "weekly"],
    ["/pricing", 0.9, "weekly"],
    ["/registry", 0.9, "daily"],
    ["/ide", 0.9, "weekly"],
    ["/cli", 0.8, "weekly"],
    ["/analyze", 0.8, "weekly"],
    ["/monitor", 0.7, "weekly"],
    ["/workspace", 0.7, "weekly"],
    ["/benchmark", 0.7, "monthly"],
    ["/security", 0.7, "monthly"],
    ["/about", 0.6, "monthly"],
    ["/research", 0.7, "weekly"],
    ["/solutions/developers", 0.8, "monthly"],
    ["/solutions/engineering-teams", 0.8, "monthly"],
    ["/solutions/security-teams", 0.8, "monthly"],
    ["/solutions/ai-agent-security", 0.8, "monthly"],
  ];

  const lastModified = new Date();

  return [
    ...staticRoutes.map(([path, priority, changeFrequency]) => ({
      url: `${BASE_URL}${path}`,
      lastModified,
      changeFrequency,
      priority,
    })),
    ...researchArticles.map(({ slug }) => ({
      url: `${BASE_URL}/research/${slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
