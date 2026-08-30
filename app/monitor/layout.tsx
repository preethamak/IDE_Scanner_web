import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Release Monitoring",
  description:
    "Approve an exact extension release once, then get one notification when a new version changes permissions, provenance, or coverage.",
  alternates: { canonical: "/monitor" },
};

export default function MonitorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
