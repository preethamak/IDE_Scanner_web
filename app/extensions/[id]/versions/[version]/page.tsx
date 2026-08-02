import { notFound } from "next/navigation";
import { Box } from "lucide-react";
import AnalysisReport from "@/app/ExtensionDossier";
import DeepScanButton from "@/app/DeepScanButton";
import { getExtensionProduct, getVersionProduct } from "@/lib/productData";
import { parseExtensionDossierData } from "@/lib/reportContract";
import { serverDb } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function VersionPage({ params }: { params: Promise<{ id: string; version: string }> }) {
  const route = await params;
  const id = decodeURIComponent(route.id);
  const version = decodeURIComponent(route.version);
  const db = await serverDb();
  const [extensionProduct, versionProduct] = await Promise.all([getExtensionProduct(id, db), getVersionProduct(id, version, db)]);
  if (!extensionProduct) notFound();
  const scan = versionProduct?.scan as Record<string, unknown> | null | undefined;
  if (!scan) return <main className="versionProductPage"><section className="emptyVersion"><Box size={34}/><span>Published exact release</span><h1>{extensionProduct.extension.display_name} <code>@{version}</code></h1><p>Deep analysis has not run for this artifact. Start a signed-in Deep Scan to add behavior, dependency, file, provenance and analyzer coverage intelligence.</p><DeepScanButton extensionId={id} version={version}/></section></main>;
  let data = null;
  try {
    data = parseExtensionDossierData({
      id, version, extension: extensionProduct.extension, versions: extensionProduct.versions, scan,
      findings: versionProduct?.findings || [], files: versionProduct?.files || [], dependencies: versionProduct?.dependencies || [],
    });
  } catch {
    data = null;
  }
  if (!data) {
    return <main className="versionProductPage"><section className="emptyVersion"><Box size={34}/><span>Report unavailable</span><h1>This report cannot be verified.</h1><p>The public report is missing required exact-artifact identity or uses an unsupported outcome. It has not been presented as a security decision.</p></section></main>;
  }
  return <AnalysisReport data={data} />;
}
