export type ChangelogEntry = {
  date: string;
  title: string;
  tag: "Product" | "Site" | "Methodology";
  paragraphs: string[];
};

// Newest first. Dates and content mirror what actually shipped (git history).
export const changelogEntries: readonly ChangelogEntry[] = [
  {
    date: "2026-08-23",
    title: "Launch access model: scanning free, early access for the rest",
    tag: "Product",
    paragraphs: [
      "The pricing page now states how Guardrails actually operates today instead of publishing prices nobody has paid yet. Scanning stays free for good. Guided reviews — a personal walkthrough of any extension that matters to you, with a written summary — are free during launch with limited weekly slots, and Release Monitoring opens to founding members through early access.",
      "Team and organization tiers get designed and priced together with design partners rather than announced into the void.",
    ],
  },
  {
    date: "2026-08-23",
    title: "Shareable preview cards for every page",
    tag: "Site",
    paragraphs: [
      "Links to Guardrails now unfurl into a generated 1200×630 card with the headline and a call to action, so shared reports look like reports instead of a bare domain.",
    ],
  },
  {
    date: "2026-08-22",
    title: "Findability and disclosure pass",
    tag: "Site",
    paragraphs: [
      "sitemap.xml and robots.txt went live for search indexing, site metadata was rewritten to state concretely what Guardrails checks, and the homepage hero now says why it matters.",
      "A security.txt file publishes our vulnerability disclosure contact (security@abscissa.dev) at /.well-known/security.txt.",
    ],
  },
  {
    date: "2026-08-21",
    title: "Homepage retold as a release review",
    tag: "Product",
    paragraphs: [
      "The landing page now walks one coherent story: a release arrives with a new capability, context opens around workspace impact, and the decision stays attached to that exact release.",
      "Monitoring alerts gained normalized severity handling, including informational findings, and Vercel publication rules serve active scanner configuration.",
    ],
  },
  {
    date: "2026-08-21",
    title: "Pricing reframed around rollout stages",
    tag: "Product",
    paragraphs: [
      "Plans now describe how teams actually adopt GuardRails — start with evidence in the registry, grow into shared decisions, then governed rollout — instead of pretending billing is finished.",
    ],
  },
  {
    date: "2026-08-20",
    title: "One light editorial system across routes",
    tag: "Site",
    paragraphs: [
      "Registry, reports, workspace, and marketing routes moved onto a single light visual system, retiring per-route dark themes.",
    ],
  },
] as const;
