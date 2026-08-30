import type { Metadata } from "next";

// The page itself is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Imported reports",
  description:
    "Report bundles you imported from the GuardRails CLI. They stay in this browser until you remove them.",
  alternates: { canonical: "/history" },
};

export default function HistoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
