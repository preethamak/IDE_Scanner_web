import Link from "next/link";
import { ArrowRight, Fingerprint, Radar, ScanSearch, ShieldCheck } from "lucide-react";
import ExtensionSearch from "@/app/ExtensionSearch";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export const dynamic = "force-dynamic";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q = "" }, inventory] = await Promise.all([searchParams, getPublicInventory()]);
  return <main className="catalogPage pageWrap">
    <section className="catalogHero exploreHero"><span className="kicker">Public extension catalog</span><h1>Know the artifact.<br/>Understand the power.</h1><p>Every published outcome belongs to one exact VSIX, scanner build, and ruleset. Expected developer-tool capabilities stay visible without being presented as malware evidence.</p><ExtensionSearch initialQuery={q} submitLabel="Find an extension"/><div className="catalogPromises"><span><Fingerprint/> Immutable Deep Scans</span><span><ShieldCheck/> Evidence-bounded outcomes</span><span><Radar/> Exact-version monitoring</span></div></section>
    <section className="catalogEvidenceIntro"><div><span className="kicker">Published evidence</span><h2>{inventory.totals.extensions || "No"} extensions with reproducible reports</h2></div><p>Catalog cards show the policy outcome, provenance, expected capability, and analysis boundary. Numeric investigation priority stays inside the full report.</p></section>
    <section className="inventoryBody catalogInventory"><header><div><span className="kicker">Exact artifacts</span><h2>Analyzed releases</h2></div><span>{inventory.totals.releases} exact releases across {inventory.totals.extensions} extensions</span></header><InventoryClient inventory={inventory}/></section>
    <section className="exploreNext"><article><ScanSearch/><div><span>Private artifact</span><h2>Analyze a VSIX that is not in a public registry.</h2><Link href="/scan?mode=upload">Analyze private VSIX <ArrowRight size={16}/></Link></div></article><article><Radar/><div><span>Signed-in monitoring</span><h2>Track releases you have already reviewed.</h2><Link href="/workspace">Open Monitor <ArrowRight size={16}/></Link></div></article></section>
  </main>;
}
