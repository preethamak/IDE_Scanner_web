import { notFound } from "next/navigation";
import PublicSecuritySummary from "@/app/PublicSecuritySummary";
import { getExtensionProduct, getVersionProduct } from "@/lib/productData";
import { serverDb } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function VersionPage({ params }: { params: Promise<{ id: string; version: string }> }) {
  const route = await params;
  const id = decodeURIComponent(route.id);
  const version = decodeURIComponent(route.version);
  const db = await serverDb();
  const [claims, extensionProduct, versionProduct] = await Promise.all([db.auth.getClaims(), getExtensionProduct(id, db), getVersionProduct(id, version, db)]);
  if (!extensionProduct) notFound();
  const scan = versionProduct?.scan as Record<string, unknown> | null | undefined;
  const scanId = scan?.id ? String(scan.id) : "";
  const fullAnalysisHref = scanId ? `/extensions/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/scans/${encodeURIComponent(scanId)}` : undefined;
  return <PublicSecuritySummary extension={extensionProduct.extension} version={version} versions={extensionProduct.versions} scan={scan || null} fullAnalysisHref={fullAnalysisHref} signedIn={Boolean(claims.data?.claims)}/>;
}
