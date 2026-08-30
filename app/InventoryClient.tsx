"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, CalendarClock, CheckCircle2, Search, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import ExtensionIcon from "@/app/ExtensionIcon";
import { deriveTrustTier } from "@/lib/trustTiers";
import type { PublicInventory, PublicInventoryItem } from "@/lib/productData";
import styles from "@/app/registry/registry.module.css";

const outcomes = ["all", "allow", "review", "block", "incomplete"] as const;
const severities = ["all", "critical", "high", "medium", "low", "info"] as const;
const labels = { allow: "Analyzed", review: "Attention", block: "Flagged by policy", incomplete: "Analysis pending" } as const;
// Rendering every report at once produced a ~37,000px page. Page in batches.
const PAGE_SIZE = 24;

export default function InventoryClient({ inventory }: { inventory: PublicInventory }) {
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<(typeof outcomes)[number]>("all");
  const [severity, setSeverity] = useState<(typeof severities)[number]>("all");
  const [sort, setSort] = useState<"recent"|"severity"|"name">("recent");
  const rows = useMemo(() => inventory.items.filter((item) => {
    const matchesText = `${item.display_name} ${item.extension_id} ${item.publisher}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (outcome === "all" || item.decision === outcome) && (severity === "all" || item.severity.toLowerCase() === severity);
  }).sort((a,b) => sort === "name" ? a.display_name.localeCompare(b.display_name) : sort === "severity" ? severityRank(b.severity) - severityRank(a.severity) : b.scanned_at.localeCompare(a.scanned_at)), [inventory.items,outcome,query,severity,sort]);
  const activeFilters = Number(outcome !== "all") + Number(severity !== "all") + Number(Boolean(query));
  const [visible, setVisible] = useState(PAGE_SIZE);
  const filterKey = `${query}|${outcome}|${severity}|${sort}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) { setPrevFilterKey(filterKey); setVisible(PAGE_SIZE); }
  const shown = rows.slice(0, visible);

  return <>
    <div className={styles.controls}>
      <label className={styles.filterSearch}><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Filter these public reports" aria-label="Filter public extension reports"/></label>
      <div className={styles.selects}><label><span>Outcome</span><select value={outcome} onChange={(event)=>setOutcome(event.target.value as typeof outcome)}>{outcomes.map(value=><option key={value} value={value}>{value === "all" ? "All outcomes" : labels[value]}</option>)}</select></label><label><span>Severity</span><select value={severity} onChange={(event)=>setSeverity(event.target.value as typeof severity)}>{severities.map(value=><option key={value} value={value}>{value === "all" ? "All severities" : title(value)}</option>)}</select></label><label><span>Sort</span><select value={sort} onChange={(event)=>setSort(event.target.value as typeof sort)}><option value="recent">Recently analyzed</option><option value="severity">Highest severity</option><option value="name">Extension name</option></select></label></div>
    </div>
    <div className={styles.resultMeta}><span><SlidersHorizontal/> {rows.length} of {inventory.items.length} reports</span>{activeFilters ? <button onClick={()=>{setQuery("");setOutcome("all");setSeverity("all")}}>Clear {activeFilters} filter{activeFilters===1?"":"s"}</button>:<span>Latest completed public result per exact artifact</span>}</div>
    <div className={styles.cards} aria-live="polite">{shown.map(item=><RegistryCard item={item} key={item.scan_id}/>)}</div>
    {rows.length > visible ? <div className={styles.showMore}><button onClick={()=>setVisible(count=>count+PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, rows.length-visible)} more of {rows.length} reports</button></div> : null}
    {!rows.length ? <div className={styles.empty}><ShieldAlert/><h3>No reports match this view.</h3><p>Clear the active filters, or search the registry above to find an extension that has not been analyzed yet.</p><button onClick={()=>{setQuery("");setOutcome("all");setSeverity("all")}}>Clear filters</button></div>:null}
  </>;
}

function RegistryCard({item}:{item:PublicInventoryItem}) {
  const tier = deriveTrustTier({ decision: item.decision === "incomplete" ? null : item.decision, analysis_status: "complete" });
  const decision = tier.tier === "unanalyzed" ? labels.incomplete : title(tier.label);
  return <Link className={styles.card} href={`/extensions/${encodeURIComponent(item.extension_id)}`} aria-label={`Open ${item.display_name} extension profile`}>
    <header><ExtensionIcon iconUrl={item.icon_url} publisher={item.publisher} name={item.display_name}/><div><strong>{item.display_name}{item.publisher_verified?<BadgeCheck aria-label="Verified publisher"/>:null}</strong><span>{item.publisher} · {item.extension_id}</span></div><ArrowUpRight/></header>
    <div className={`${styles.outcome} ${styles[item.decision]}`}><span>{item.decision === "allow" ? <CheckCircle2/> : <ShieldAlert/>}{decision}</span><small>{title(item.severity)} severity</small></div>
    <p>{item.decision_reason || item.description}</p>
    <div className={styles.cardFacts}><span><CalendarClock/> Analyzed {shortDate(item.scanned_at)}</span><span><b>{item.coverage_percent}%</b> evidence coverage</span></div>
    <footer><span>Exact release <code>@{item.version}</code></span><strong>Open security profile <ArrowUpRight/></strong></footer>
  </Link>;
}

function title(value:string){return value.toLowerCase().replace(/^./,letter=>letter.toUpperCase())}
function shortDate(value:string){return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}).format(new Date(value))}
function severityRank(value:string){return ({CRITICAL:5,HIGH:4,MEDIUM:3,LOW:2,INFO:1}[value]||0)}
