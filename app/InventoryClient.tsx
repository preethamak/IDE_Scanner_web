"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Filter, Radar, Search, ShieldCheck } from "lucide-react";
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
  const distribution = useMemo(() => {
    const total = inventory.items.length || 1;
    const bucket = (decision: string) => inventory.items.filter((item) => item.decision === decision).length;
    return [
      { key: "allow", label: "No known concern", count: bucket("allow"), pct: (bucket("allow") / total) * 100 },
      { key: "review", label: "Review", count: bucket("review"), pct: (bucket("review") / total) * 100 },
      { key: "block", label: "Do not install", count: bucket("block"), pct: (bucket("block") / total) * 100 },
      { key: "incomplete", label: "Incomplete", count: bucket("incomplete"), pct: (bucket("incomplete") / total) * 100 },
    ].filter((band) => band.count);
  }, [inventory.items]);
  return <>
    <div className="inventoryDistribution" aria-label="Decision distribution across the registry">
      <span className="inventoryDistributionLabel"><Radar/> Registry outcomes at a glance</span>
      <div className="inventoryDistributionBar" role="img" aria-label={distribution.map((b) => `${b.count} ${b.label}`).join(", ")}>{distribution.map((band) => <i key={band.key} className={`dist-${band.key}`} style={{ width: `${band.pct}%` }} title={`${band.label}: ${band.count}`}/>)}</div>
      <div className="inventoryDistributionKey">{distribution.map((band) => <span key={band.key}><i className={`dist-${band.key}`}/>{band.label} <b>{band.count}</b></span>)}</div>
    </div>
    <div className="inventoryControls"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search scanned extensions" aria-label="Search scanned extensions"/></label><div role="group" aria-label="Filter public scans by severity">{filters.map((value) => <button type="button" className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}><Filter/>{value === "all" ? "All severities" : value}</button>)}</div></div>
    <div className="inventoryCards" aria-live="polite">{rows.map((item) => { const risk = Math.max(0, Math.min(100, Math.max(item.risk_score, item.malware_score))); return <Link className="inventoryCard" key={item.extension_id} href={`/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}`} aria-label={`Open ${item.display_name} Deep Scan`}><ExtensionIcon iconUrl={item.icon_url} publisher={item.publisher} name={item.display_name}/><b className={`inventorySeverity severity-${item.severity.toLowerCase()}`}>{item.severity === "INFO" ? "Informational" : item.severity}</b><div><strong>{item.display_name}{item.publisher_verified ? <BadgeCheck aria-label="Verified Marketplace publisher"/> : null}</strong><code>{item.extension_id}@{item.version}</code><p>{item.description || item.publisher}</p><span className="inventoryRiskMeter" aria-label={`Risk index ${risk} of 100`}><i className={riskTone(risk)} style={{ width: `${risk}%` }}/></span></div><span className="inventoryCardGo">Deep Scan <ArrowUpRight/></span></Link>; })}</div>
    {!rows.length ? <div className="inventoryEmpty"><ShieldCheck/><h2>No public scan matches this view.</h2><p>Try another search or outcome filter.</p></div> : null}
  </>;
}

function riskTone(value: number) { return value >= 66 ? "risk-high" : value >= 33 ? "risk-mid" : "risk-low"; }
