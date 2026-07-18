import { Activity, CircleAlert, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export default async function PublicScanPage() {
  const inventory = await getPublicInventory();
  const attention = inventory.items.filter((item) => ["CRITICAL", "HIGH"].includes(item.severity)).length;
  const cards = [[ScanSearch, inventory.totals.extensions, "extensions scanned"], [PackageCheck, inventory.totals.releases, "exact releases recorded"], [Activity, inventory.totals.complete, "completed reports"], [CircleAlert, attention, "high or critical severity"]] as const;
  return <main className="inventoryPage pageWrap"><section className="inventoryHero"><span className="kicker">Registry overview · Tier 1</span><h1>Scan the registry.<br/>Open the Deep Scan.</h1><p>This is the at-a-glance layer: outcome, severity, and a risk read for every exact Marketplace version. Open any extension for the full Deep Scan — files, evidence, capabilities, and release changes.</p><div className="inventoryStats">{cards.map(([Icon, value, label]) => <article key={label}><Icon/><strong>{value.toLocaleString()}</strong><span>{label}</span></article>)}</div></section><section className="inventoryBody"><header><div><span className="kicker">Browse the registry</span><h2>Extensions</h2></div></header><InventoryClient inventory={inventory}/></section><section className="inventoryBoundary"><ShieldCheck/><p>The overview shows outcome and risk. Deep Scan opens the exact artifact — every file, finding, capability, and release change.</p></section></main>;
}
