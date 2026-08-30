import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Team Workspace",
  description:
    "Monitor exact extension releases as a team: route meaningful changes to an owner and keep the evidence behind every allow, review, or block decision.",
  alternates: { canonical: "/workspace" },
};

export default function WorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
