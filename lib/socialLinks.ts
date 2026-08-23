// Community profiles shown in the footer. Entries render only when a real,
// live profile exists — leave empty rather than pointing at placeholders.
// To add one: { label: "GitHub", href: "https://github.com/<org>" }
export type SocialLink = { label: string; href: string };

export const socialLinks: readonly SocialLink[] = [];
