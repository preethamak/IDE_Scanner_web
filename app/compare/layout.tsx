import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Compare versions",
  description:
    "Pick two analyzed versions of an extension and compare their permissions, capabilities, and findings side by side.",
  alternates: { canonical: "/compare" },
};

export default function CompareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
