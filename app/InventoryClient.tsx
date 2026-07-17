"use client";

import Link from "next/link";
import { ArrowUpRight, Filter, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicInventory } from "@/lib/productData";

const filters = ["all", "critical", "high", "medium", "low", "info"] as const;

export default function InventoryClient({ inventory }: { inventory: PublicInventory }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const rows = useMemo(() => inventory.items.filter((item) => {
    const haystack = `${item.display_name} ${item.extension_id} ${item.publisher}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (filter === "all" || item.severity.toLowerCase() === filter);
  }), [filter, inventory.items, query]);
  return <>
    <div className="inventoryControls"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scanned extensions" aria-label="Search scanned extensions"/></label><div role="group" aria-label="Filter public scans by severity">{filters.map((value) => <button type="button" className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}><Filter/>{value === "all" ? "All severities" : value}</button>)}</div></div>
    <div className="inventoryList" aria-live="polite"><header><span>Extension</span><span>Severity</span><span>Coverage</span><span>Risk</span><span/></header>{rows.map((item) => <article key={item.extension_id}><span className="inventoryIcon">{item.icon_url ? <img src={item.icon_url} alt=""/> : <ShieldCheck/>}</span><div><strong>{item.display_name}</strong><code>{item.extension_id}@{item.version}</code><p>{item.publisher} · {item.description}</p></div><b className={`inventorySeverity severity-${item.severity.toLowerCase()}`}>{item.severity === "INFO" ? "Informational" : item.severity}</b><strong>{item.coverage_percent}%</strong><strong>{item.risk_score}<small>/100 risk</small></strong><Link href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`} aria-label={`Open ${item.display_name} report`}><ArrowUpRight/></Link></article>)}</div>
    {!rows.length ? <div className="inventoryEmpty"><ShieldCheck/><h2>No public scan matches this view.</h2><p>Try another search or outcome filter.</p></div> : null}
  </>;
}
