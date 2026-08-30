import type { Metadata } from "next";

// The index page is a client component, so its metadata lives here. Individual
// report routes define their own metadata.
export const metadata: Metadata = {
  title: "Portable reports",
  description:
    "Import a GuardRails CLI report bundle and read it in the browser. Bundles stay local until you choose to move them.",
  alternates: { canonical: "/reports" },
};

export default function ReportsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
