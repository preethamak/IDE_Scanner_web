import type { Metadata } from "next";
import GuardRailsWorkbench from "./GuardRailsWorkbench";

export const metadata: Metadata = {
  title: "GuardRails IDE security control plane",
  description: "Preview capability-isolated extensions and AI agents in GuardRails IDE.",
};

export default function GuardRailsIdePage() {
  return <GuardRailsWorkbench />;
}
