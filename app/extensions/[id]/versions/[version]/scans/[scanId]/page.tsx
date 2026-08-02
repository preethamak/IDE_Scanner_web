import { notFound } from "next/navigation";
import AnalysisReport from "@/app/ExtensionDossier";
import { getExtensionProduct, getVersionScanProduct } from "@/lib/productData";
import { parseExtensionDossierData } from "@/lib/reportContract";
import { serverDb } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function ImmutableScanPage({ params }: { params: Promise<{ id: string; version: string; scanId: string }> }) {
  const route = await params;
  const id = decodeURIComponent(route.id);
  const version = decodeURIComponent(route.version);
  const scanId = decodeURIComponent(route.scanId);
  const db = await serverDb();
  const [extensionProduct, versionProduct] = await Promise.all([getExtensionProduct(id, db), getVersionScanProduct(id, version, scanId, db)]);
  if (!extensionProduct || !versionProduct?.scan) notFound();
  let data = null;
  try {
    data = parseExtensionDossierData({
      id, version, extension: extensionProduct.extension, versions: extensionProduct.versions, scan: versionProduct.scan,
      findings: versionProduct.findings || [], files: versionProduct.files || [], dependencies: versionProduct.dependencies || [],
    });
  } catch {
    data = null;
  }
  if (!data) {
    return <main className="versionProductPage"><section className="emptyVersion"><span>Report unavailable</span><h1>This immutable report cannot be verified.</h1><p>The report is missing required exact-artifact identity or uses an unsupported outcome. It has not been presented as a security decision.</p></section></main>;
  }
  return <AnalysisReport data={data} />;
}
