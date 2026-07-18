"use client";

import Link from "next/link";
import { ArrowUpRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicInventory } from "@/lib/productData";
import ExtensionIcon from "@/app/ExtensionIcon";

const filters = ["all", "critical", "high", "medium", "low", "info"] as const;

export default function InventoryClient({ inventory }: { inventory: PublicInventory }) {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const rows = useMemo(() => inventory.items.filter((item) => {
    const haystack = `${item.display_name} ${item.extension_id} ${item.publisher}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (filter === "all" || item.severity.toLowerCase() === filter);
  }), [filter, inventory.items, query]);
  return <>
    <div className="inventoryControls"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scanned extensions" aria-label="Search scanned extensions"/></label><div role="group" aria-label="Filter public scans by severity">{filters.map((value) => <button type="button" className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}><Filter/>{value === "all" ? "All severities" : value}</button>)}</div></div>
    <div className="inventoryCards" aria-live="polite">{rows.map((item) => <Link className="inventoryCard" key={item.extension_id} href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`} aria-label={`Open ${item.display_name} report`}><ExtensionIcon iconUrl={item.icon_url} publisher={item.publisher} name={item.display_name}/><b className={`inventorySeverity severity-${item.severity.toLowerCase()}`}>{item.severity === "INFO" ? "Informational" : item.severity}</b><div><strong>{item.display_name}</strong><code>{item.extension_id}@{item.version}</code><p>{item.description || item.publisher}</p></div><ArrowUpRight/></Link>)}</div>
    {!rows.length ? <div className="inventoryEmpty"><ShieldCheck/><h2>No public scan matches this view.</h2><p>Try another search or outcome filter.</p></div> : null}
  </>;
}
