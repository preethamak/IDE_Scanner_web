"use client";

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Filter, Fingerprint, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicInventory } from "@/lib/productData";
import { normalizePublicOutcome, outcomeMeta } from "@/lib/publicOutcome";
import ExtensionIcon from "@/app/ExtensionIcon";

const filters = ["all", "clear", "expected_capability", "investigate", "blocked", "incomplete"] as const;

export default function InventoryClient({ inventory }: { inventory: PublicInventory }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const rows = useMemo(() => inventory.items.filter((item) => {
    const haystack = `${item.display_name} ${item.extension_id} ${item.publisher} ${item.description}`.toLowerCase();
    const outcome = normalizePublicOutcome(item.public_outcome, item.decision);
    const matchesFilter = filter === "all" || filter === "blocked" ? filter === "all" || outcome === "preventive_block" || outcome === "confirmed_threat" : outcome === filter;
    return (!query || haystack.includes(query.toLowerCase())) && matchesFilter;
  }), [filter, inventory.items, query]);
  const distribution = useMemo(() => {
    const total = inventory.items.length || 1;
    const buckets = new Map<string, number>();
    for (const item of inventory.items) {
      const outcome = normalizePublicOutcome(item.public_outcome, item.decision);
      buckets.set(outcome, (buckets.get(outcome) || 0) + 1);
    }
    return [...buckets.entries()].map(([key, count]) => ({ key, count, pct: (count / total) * 100, meta: outcomeMeta(key) }));
  }, [inventory.items]);
  return <>
    <div className="inventoryDistribution" aria-label="Public outcome distribution">
      <span className="inventoryDistributionLabel"><Fingerprint/> Exact artifact outcomes</span>
      <div className="inventoryDistributionBar" role="img" aria-label={distribution.map((band) => `${band.count} ${band.meta.short}`).join(", ")}>{distribution.map((band) => <i key={band.key} className={`dist-${band.meta.tone}`} style={{ width: `${band.pct}%` }} title={`${band.meta.short}: ${band.count}`}/>)}</div>
      <div className="inventoryDistributionKey">{distribution.map((band) => <span key={band.key}><i className={`dist-${band.meta.tone}`}/>{band.meta.short} <b>{band.count}</b></span>)}</div>
    </div>
    <div className="inventoryControls"><label><Search/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search analyzed extensions" aria-label="Search analyzed extensions"/></label><div role="group" aria-label="Filter public scans by outcome">{filters.map((value) => <button type="button" className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}><Filter/>{filterLabel(value)}</button>)}</div></div>
    <div className="inventoryCards" aria-live="polite">{rows.map((item) => {
      const outcome = normalizePublicOutcome(item.public_outcome, item.decision);
      const meta = outcomeMeta(outcome);
      const href = `/extensions/${encodeURIComponent(item.extension_id)}/versions/${encodeURIComponent(item.version)}/scans/${encodeURIComponent(item.scan_id)}`;
      return <Link className={`inventoryCard outcome-${meta.tone}`} key={item.scan_id} href={href} aria-label={`Open the immutable ${item.display_name} Deep Scan`}>
        <ExtensionIcon iconUrl={item.icon_url} publisher={item.publisher} name={item.display_name}/>
        <b className={`inventoryOutcome ${meta.tone}`}>{meta.short}</b>
        <div className="inventoryCardBody"><strong>{item.display_name}{item.publisher_verified ? <BadgeCheck aria-label="Verified Marketplace publisher"/> : null}</strong><code>{item.extension_id}@{item.version}</code><p>{item.description}</p><div className="inventoryTrust"><span className={`trust-${item.provenance_tier}`}>{provenanceLabel(item.provenance_tier)}</span><span>{item.coverage_percent}% analysis coverage</span></div><small>SHA {item.artifact_sha256.slice(0, 12)} · build {item.scanner_build.slice(0, 10)} · rules {item.ruleset_version}</small></div>
        <span className="inventoryCardGo">Exact Deep Scan <ArrowUpRight/></span>
      </Link>;
    })}</div>
    {!rows.length ? <div className="inventoryEmpty"><ShieldCheck/><h2>No published scan matches this view.</h2><p>Only complete, reproducible registry and benchmark reports appear here.</p></div> : null}
  </>;
}

function filterLabel(value: (typeof filters)[number]) {
  return ({ all: "All outcomes", clear: "Allow · clear", expected_capability: "Expected capability", investigate: "Investigate", blocked: "Blocked", incomplete: "Incomplete" } as const)[value];
}
function provenanceLabel(value: string) { return value === "established" ? "Established provenance" : value === "verified" ? "Verified publisher" : value === "conflicted" ? "Provenance conflict" : "Provenance not established"; }
