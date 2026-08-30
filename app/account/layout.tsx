import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to GuardRails to monitor extension releases and share review decisions with your team.",
  alternates: { canonical: "/account" },
  robots: { index: false },
};

export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
