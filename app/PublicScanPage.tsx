import Link from "next/link";
import { ArrowRight, PackageCheck, ScanSearch, ShieldCheck } from "lucide-react";
import ExtensionSearch from "@/app/ExtensionSearch";
import InventoryClient from "@/app/InventoryClient";
import { getPublicInventory } from "@/lib/productData";
import { deriveTrustTier } from "@/lib/trustTiers";
import styles from "@/app/registry/registry.module.css";

const popular = ["GitHub Copilot", "Cline", "Continue", "ESLint", "Docker"];

export default async function ExtensionRegistryPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const inventory = await getPublicInventory();
  const reviewCount = inventory.items.filter((item) => item.decision === "review" || item.decision === "block").length;
  const spotlight = inventory.items.find((item) => item.decision === "review" || item.decision === "block") || inventory.items[0];
  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}><i/> Extension intelligence</span><h1>Know what runs<br/>in your editor.</h1><p>Search any VS Code or Open VSX extension. Search by name or ID, confirm you found the right one, and read what each release can access before installing.</p></div>
      <div className={styles.searchPanel}><div className={styles.searchHeading}><span><ScanSearch/> Search the registry</span><small>Marketplace + Open VSX</small></div><div className={styles.discoverySearch}><ExtensionSearch initialQuery={q || ""} submitLabel="Find extension"/></div><div className={styles.popular}><span>Popular</span>{popular.map((name) => <Link key={name} href={`/registry?q=${encodeURIComponent(name)}`}>{name}</Link>)}</div><footer><ShieldCheck/><span>Results separate exact matches from similar names.</span></footer></div>
    </section>

    <section className={styles.snapshot} aria-label="Registry snapshot">
      <div><span>Public intelligence</span><strong>{inventory.totals.extensions.toLocaleString()}</strong><small>extensions analyzed</small></div>
      <div><span>Exact artifacts</span><strong>{inventory.totals.releases.toLocaleString()}</strong><small>versioned reports</small></div>
      <div><span>Needs attention</span><strong>{reviewCount.toLocaleString()}</strong><small>review or block outcomes</small></div>
      <div><span>Last refreshed</span><strong>{relativeTime(inventory.totals.lastScannedAt)}</strong><small>latest completed analysis</small></div>
    </section>

    {spotlight && !q ? <section className={styles.signalRoom}>
      <div className={styles.signalIntro}><span className={styles.eyebrow}><i/> Latest finding</span><h2>A recent result worth knowing about.</h2><p>One recent analysis that needs a human decision, refreshed as new releases ship.</p><Link href={`/extensions/${encodeURIComponent(spotlight.extension_id)}`}>Open the full report <ArrowRight/></Link></div>
      <article className={styles.signalCard}><header><div><span>Current public signal</span><strong>{spotlight.display_name}</strong><code>{spotlight.extension_id}@{spotlight.version}</code></div><em className={styles[`signal${signalTone(spotlight.decision)}`]}>{deriveTrustTier(spotlight).label}</em></header><div className={styles.signalEvidence}><div><small>Why it is flagged</small><strong>{spotlight.decision_reason}</strong></div><div><span><b>{spotlight.coverage_percent}%</b> evidence coverage</span><span><b>{spotlight.severity}</b> highest severity</span><span><b>{spotlight.artifact_sha256.slice(0,12)}</b> artifact identity</span></div></div><footer><ShieldCheck/><span>Applies only to this exact release</span><Link href={`/extensions/${encodeURIComponent(spotlight.extension_id)}`}>Open report <ArrowRight/></Link></footer></article>
    </section>:null}

    <section className={styles.catalog}>
      <header className={styles.catalogHeader}><div><span className={styles.eyebrow}><i/> Public reports</span><h2>Recently analyzed<br/>extensions.</h2></div><p>Every report covers one exact release. Open an extension to see its versions and what changed between them.</p></header>
      <InventoryClient inventory={inventory}/>
    </section>

    <section className={styles.trustStrip}><PackageCheck/><div><span>Version-specific</span><strong>A decision never silently follows an extension update.</strong><p>“Analyzed” describes only the analyzed artifact and available evidence. It is not a guarantee of safety.</p></div><Link href="/research">How analysis works <ArrowRight/></Link></section>
  </main>;
}

function signalTone(decision: string) { return decision === "allow" ? "Allow" : decision === "block" ? "Block" : "Review"; }

function relativeTime(value: string | null) {
  if (!value) return "Awaiting data";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
