"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Search, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { MarketplaceSearchResult } from "@/lib/types";

const featured = [
  { id: "JuanBlanco.solidity", name: "Solidity", publisher: "Juan Blanco", installs: "1.8M", decision: "REVIEW", tone: "review", detail: "Compiler downloads, credential configuration, and filesystem capabilities." },
  { id: "esbenp.prettier-vscode", name: "Prettier", publisher: "Prettier", installs: "50M+", decision: "ANALYZE", tone: "neutral", detail: "Request an exact-version artifact analysis." },
  { id: "ms-python.python", name: "Python", publisher: "Microsoft", installs: "170M+", decision: "ANALYZE", tone: "neutral", detail: "Large extension surface; inspect the selected release." },
];

export default function CatalogPage() {
  return <Suspense fallback={<main className="catalogPage pageWrap"><div className="message">Loading extension catalog…</div></main>}><CatalogContent /></Suspense>;
}

function CatalogContent() {
  const initialQuery = useSearchParams().get("q")?.trim() || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MarketplaceSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(initialQuery ? "loading" : "idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initialQuery) return;
    fetch(`/api/marketplace/search?q=${encodeURIComponent(initialQuery)}`)
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => { if (!response.ok) throw new Error(body.error || "Marketplace search failed"); setResults(body.results || []); setStatus("idle"); })
      .catch((cause) => { setError(cause instanceof Error ? cause.message : "Marketplace search failed"); setStatus("error"); });
  }, [initialQuery]);
  async function runSearch(value = query) { const clean = value.trim(); if (!clean) return; setStatus("loading"); setError(""); try { const response = await fetch(`/api/marketplace/search?q=${encodeURIComponent(clean)}`); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Marketplace search failed"); setResults(body.results || []); setStatus("idle"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Marketplace search failed"); setStatus("error"); } }

  return <main className="catalogPage pageWrap">
    <section className="catalogHero"><span className="kicker">Public extension intelligence</span><h1>Choose the version.<br/>Understand the access.</h1><p>Search VS Marketplace and Open VSX. Every product page keeps registry identity, release history, artifact evidence, dependencies and scan scope separate.</p><form onSubmit={(event) => { event.preventDefault(); void runSearch(); }}><Search size={20}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Extension name, publisher.extension, or Marketplace URL"/><button className="button buttonDark" disabled={status === "loading"}>{status === "loading" ? "Searching…" : "Search catalog"}</button></form><div className="catalogPromises"><span>Exact-version decisions</span><span>Static-only analysis</span><span>Public, shareable evidence</span></div></section>
    {error ? <div className="message errorMessage">{error}</div> : null}
    {results.length ? <section className="catalogResults"><div className="resultHeader"><div><span className="kicker">Registry results</span><h2>{results.length} extensions found</h2></div><span>Select an extension to inspect versions and evidence</span></div><div className="catalogTable"><div className="catalogTableHead"><span>Extension</span><span>Publisher</span><span>Latest</span><span>Registry / adoption</span><span/></div>{results.map((item) => <article key={item.extension_id}><div className="extensionIdentity"><span>{item.publisher.slice(0, 2).toUpperCase()}</span><div><strong>{item.display_name}</strong><code>{item.extension_id}</code><p>{item.short_description}</p></div></div><span>{item.publisher_display_name}{item.publisher_verified ? <BadgeCheck size={14}/> : null}</span><code>{item.version}</code><span>{item.registry === "openvsx" ? "Open VSX" : "VS Marketplace"} · {formatCompact(item.install_count)}</span><Link className="rowAction" href={`/extensions/${encodeURIComponent(item.extension_id)}`} aria-label={`Open ${item.extension_id}`}><ArrowRight size={18}/></Link></article>)}</div></section> : <section className="featuredCatalog"><div className="resultHeader"><div><span className="kicker">Start exploring</span><h2>Frequently inspected</h2></div><Link className="textLink" href="/metrics">How analysis works <ArrowRight size={15}/></Link></div><div className="featuredGrid">{featured.map((item) => <article key={item.id}><div className="featuredTop"><span><ShieldCheck size={18}/></span><b className={`decision ${item.tone}`}>{item.decision}</b></div><h3>{item.name}</h3><code>{item.id}</code><p>{item.detail}</p><div><span>{item.publisher}</span><span>{item.installs} installs</span></div><Link href={`/extensions/${encodeURIComponent(item.id)}`}>Open intelligence <ArrowRight size={15}/></Link></article>)}</div></section>}
  </main>;
}

function formatCompact(value: number) { return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0); }
