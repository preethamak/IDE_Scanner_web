import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Release diff",
  description:
    "Compare an extension release against the previously analyzed version to see which capabilities and permissions changed.",
  alternates: { canonical: "/diff" },
};

export default function DiffLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
