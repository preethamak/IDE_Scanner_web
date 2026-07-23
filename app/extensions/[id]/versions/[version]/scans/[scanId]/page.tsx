import { notFound } from "next/navigation";
import ExtensionDossier from "@/app/ExtensionDossier";
import { getExtensionProduct, getVersionScanProduct } from "@/lib/productData";
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
  return <ExtensionDossier id={id} version={version} extension={extensionProduct.extension as unknown as Record<string, unknown>} versions={extensionProduct.versions} scan={versionProduct.scan as Record<string, unknown>} findings={(versionProduct.findings || []) as Record<string, unknown>[]} files={(versionProduct.files || []) as Record<string, unknown>[]} dependencies={(versionProduct.dependencies || []) as Record<string, unknown>[]}/>;
}
