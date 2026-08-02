import { Activity, CircleAlert, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import ExtensionSearch from "@/app/ExtensionSearch";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export default async function ExtensionRegistryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const inventory = await getPublicInventory();
  const attention = inventory.items.filter((item) => ["CRITICAL", "HIGH"].includes(item.severity)).length;
  const cards = [[ScanSearch, inventory.totals.extensions, "extensions scanned"], [PackageCheck, inventory.totals.releases, "exact releases recorded"], [Activity, inventory.totals.complete, "completed reports"], [CircleAlert, attention, "high or critical severity"]] as const;
  return <main className="inventoryPage pageWrap"><section className="inventoryHero"><span className="kicker">Extension Registry</span><h1>Check an extension<br/>before you install it.</h1><p>Find an extension, read its README, see its published versions, and open any available security report.</p><ExtensionSearch initialQuery={q || ""} submitLabel="Search extensions"/><div className="inventoryStats">{cards.map(([Icon, value, label]) => <article key={label}><Icon/><strong>{value.toLocaleString()}</strong><span>{label}</span></article>)}</div></section><section className="inventoryBody"><header><div><span className="kicker">Recently reviewed</span><h2>Extensions</h2></div></header><InventoryClient inventory={inventory}/></section><section className="inventoryBoundary"><ShieldCheck/><p>Open any extension to read its documentation, compare versions, and view a completed Analysis Report.</p></section></main>;
}
