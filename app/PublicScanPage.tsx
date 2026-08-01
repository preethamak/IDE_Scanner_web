import { Activity, CircleAlert, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export default async function ExtensionRegistryPage() {
  const inventory = await getPublicInventory();
  const attention = inventory.items.filter((item) => ["CRITICAL", "HIGH"].includes(item.severity)).length;
  const cards = [[ScanSearch, inventory.totals.extensions, "extensions scanned"], [PackageCheck, inventory.totals.releases, "exact releases recorded"], [Activity, inventory.totals.complete, "completed reports"], [CircleAlert, attention, "high or critical severity"]] as const;
  return <main className="inventoryPage pageWrap"><section className="inventoryHero"><span className="kicker">Extension Registry</span><h1>Browse completed<br/>extension analysis.</h1><p>Each entry is a completed Analysis Report for one exact Marketplace release. Compare the outcome and severity here, then open the report for evidence, capabilities, files, and release changes.</p><div className="inventoryStats">{cards.map(([Icon, value, label]) => <article key={label}><Icon/><strong>{value.toLocaleString()}</strong><span>{label}</span></article>)}</div></section><section className="inventoryBody"><header><div><span className="kicker">Completed Analysis Reports</span><h2>Extensions</h2></div></header><InventoryClient inventory={inventory}/></section><section className="inventoryBoundary"><ShieldCheck/><p>The Extension Registry summarizes completed Analysis Reports. Open a report to inspect the exact artifact, evidence, capabilities, and release changes.</p></section></main>;
}
