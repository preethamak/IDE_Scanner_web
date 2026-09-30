import type { Metadata } from "next";
import McpRegistryPage from "@/app/mcp/page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MCP Server Registry",
  description: "Browse MCP server metadata and assess server descriptors with GuardRails evidence-led metrics.",
  alternates: { canonical: "/registry/mcp" },
};

export default McpRegistryPage;
