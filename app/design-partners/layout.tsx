import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Design partners",
  description:
    "Help validate GuardRails extension analysis against extensions you already understand. A research collaboration, not a sales funnel.",
  alternates: { canonical: "/design-partners" },
};

export default function DesignPartnersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
