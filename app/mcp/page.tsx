import type { Metadata } from "next";
import McpRegistryClient from "./McpRegistryClient";
import { loadMcpDirectory } from "@/lib/mcpRegistry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MCP Server Registry",
  description: "Browse MCP server metadata and assess server descriptors with GuardRails evidence-led metrics.",
  alternates: { canonical: "/registry/mcp" },
};

export default async function McpRegistryPage() {
  return <McpRegistryClient entries={await loadMcpDirectory()} />;
}
