import { Activity, CircleAlert, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export default async function PublicScanPage() {
  const inventory = await getPublicInventory();
  const attention = inventory.items.filter((item) => ["CRITICAL", "HIGH"].includes(item.severity)).length;
  const cards = [[ScanSearch, inventory.totals.extensions, "extensions scanned"], [PackageCheck, inventory.totals.releases, "exact releases recorded"], [Activity, inventory.totals.complete, "completed reports"], [CircleAlert, attention, "high or critical severity"]] as const;
  return <main className="inventoryPage pageWrap"><section className="inventoryHero"><span className="kicker">Extension registry</span><h1>Find the extension.<br/>See the result.</h1><p>Every entry opens a clear report for one exact Marketplace version.</p><div className="inventoryStats">{cards.map(([Icon, value, label]) => <article key={label}><Icon/><strong>{value.toLocaleString()}</strong><span>{label}</span></article>)}</div></section><section className="inventoryBody"><header><div><span className="kicker">Browse reports</span><h2>Extensions</h2></div></header><InventoryClient inventory={inventory}/></section><section className="inventoryBoundary"><ShieldCheck/><p>Open any extension to inspect its result, version, and supporting evidence.</p></section></main>;
}
