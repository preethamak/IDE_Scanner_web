import type { Metadata } from "next";
import ExtensionRegistryPage from "@/app/PublicScanPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Extension Registry",
  description:
    "Browse exact-release GuardRails analysis reports for published VS Code extensions before you install one.",
  alternates: { canonical: "/registry" },
};

export default ExtensionRegistryPage;
