import { Activity, CircleAlert, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export default async function PublicScanPage() {
  const inventory = await getPublicInventory();
  const attention = inventory.items.filter((item) => ["CRITICAL", "HIGH", "MEDIUM"].includes(item.severity)).length;
  const cards = [[ScanSearch, inventory.totals.extensions, "extensions scanned"], [PackageCheck, inventory.totals.releases, "exact releases recorded"], [Activity, inventory.totals.complete, "completed reports"], [CircleAlert, attention, "medium or higher severity"]] as const;
  return <main className="inventoryPage pageWrap"><section className="inventoryHero"><span className="kicker">Shared extension intelligence / 2026.07.16</span><h1>Extension registry,<br/>ready to inspect.</h1><p>One shared, hash-pinned view of the 30 exact Marketplace artifacts in the July 16 validation cohort. Every row shows the final updated-scanner result alongside its exact version and evidence boundary.</p><div className="inventoryStats">{cards.map(([Icon, value, label]) => <article key={label}><Icon/><strong>{value.toLocaleString()}</strong><span>{label}</span></article>)}</div></section><section className="inventoryBody"><header><div><span className="kicker">Exact artifacts</span><h2>Extension Registry</h2></div><span>{inventory.totals.lastScannedAt ? `Cohort published ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(inventory.totals.lastScannedAt))}` : "July 16 validation cohort"}</span></header><InventoryClient inventory={inventory}/></section><section className="inventoryBoundary"><ShieldCheck/><p>This shared registry contains only the frozen benchmark extensions. Each row links to the common report surface with the exact version, hash, final coverage, and result evidence.</p></section></main>;
}
