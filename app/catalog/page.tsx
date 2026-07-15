"use client";

import Link from "next/link";
import { ArrowRight, Radar, ScanSearch } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ExtensionSearch from "@/app/ExtensionSearch";

export default function CatalogPage() { return <Suspense fallback={<main className="pageWrap"><div className="message">Loading Explore…</div></main>}><Explore /></Suspense>; }

function Explore() {
  const query = useSearchParams().get("q") || "";
  return <main className="catalogPage pageWrap">
    <section className="catalogHero exploreHero"><span className="kicker">Explore · public intelligence</span><h1>Find the extension.<br/>Read the evidence.</h1><p>Search published IDE extensions across supported registries. Identity, release history, and artifact evidence stay separate so metadata never masquerades as analysis.</p><ExtensionSearch initialQuery={query} submitLabel="Explore extensions"/><div className="catalogPromises"><span>Exact-version dossiers</span><span>Published icon or branded fallback</span><span>Public without sign-in</span></div></section>
    <section className="exploreNext"><article><ScanSearch/><div><span>Need to inspect a package?</span><h2>Analyze a published extension or private VSIX.</h2><Link href="/scan">Analyze extension <ArrowRight size={16}/></Link></div></article><article><Radar/><div><span>Signed-in monitoring</span><h2>Track releases you have already reviewed.</h2><Link href="/workspace">Open Monitor <ArrowRight size={16}/></Link></div></article></section>
  </main>;
}
