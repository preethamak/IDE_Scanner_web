import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "API Documentation",
  description:
    "Public GuardRails APIs: the CI release gate, bulk gate for team inventories, SVG trust badges, the public analysis inventory, and the MCP server for AI agents.",
  alternates: { canonical: "/docs" },
};

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children;
}
