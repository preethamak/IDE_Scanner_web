import { Activity, CircleAlert, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";

export default async function PublicScanPage() {
  const inventory = await getPublicInventory();
  const attention = inventory.items.filter((item) => ["CRITICAL", "HIGH", "MEDIUM"].includes(item.severity)).length;
  const cards = [[ScanSearch, inventory.totals.extensions, "extensions scanned"], [PackageCheck, inventory.totals.releases, "exact releases recorded"], [Activity, inventory.totals.complete, "completed reports"], [CircleAlert, attention, "medium or higher severity"]] as const;
  return <main className="inventoryPage pageWrap"><section className="inventoryHero"><span className="kicker">Public intelligence / live scans</span><h1>Public scans,<br/>ready to inspect.</h1><p>This is the growing public record of exact IDE artifacts we have analyzed. It excludes private requests, development scans, and the frozen validation benchmark.</p><div className="inventoryStats">{cards.map(([Icon, value, label]) => <article key={label}><Icon/><strong>{value.toLocaleString()}</strong><span>{label}</span></article>)}</div></section><section className="inventoryBody"><header><div><span className="kicker">Exact artifacts</span><h2>Public Scan</h2></div><span>{inventory.totals.lastScannedAt ? `Latest scan ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(inventory.totals.lastScannedAt))}` : "Waiting for the first public scan"}</span></header><InventoryClient inventory={inventory}/></section><section className="inventoryBoundary"><ShieldCheck/><p>Each row represents the latest public report for an extension. Open it to inspect the exact version, hash, evidence, coverage, and recorded source previews.</p></section></main>;
}
