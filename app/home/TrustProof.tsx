import Link from "next/link";
import { ArrowRight, Bug, Database, Radar, ShieldCheck } from "lucide-react";
import styles from "./authorityLanding.module.css";
import { getPublicMetrics } from "@/lib/publicMetrics";
import { getPublicSecurityFeed } from "@/lib/productData";

export default async function TrustProof() {
  const [metrics, detections] = await Promise.all([
    getPublicMetrics(),
    getPublicSecurityFeed(24),
  ]);
  const stats = [
    {
      value: formatCount(metrics.exact_releases_indexed),
      label: "Exact releases indexed",
      icon: Database,
    },
    {
      value: formatCount(metrics.exact_releases_analyzed),
      label: "Releases with complete analysis",
      icon: ShieldCheck,
    },
    {
      value: formatCount(metrics.known_bad_artifacts),
      label: "Known-bad artifacts confirmed",
      icon: Bug,
    },
    {
      value: String(detections.length),
      label: "Extensions currently flagged",
      icon: Radar,
    },
  ];

  return (
    <section className={styles.trust} aria-labelledby="trust-heading">
      <header>
        <span id="trust-heading">The evidence is public. Check our work.</span>
        <small>Live from the GuardRails registry</small>
      </header>
      <div>
        {stats.map(({ value, label, icon: Icon }) => (
          <article key={label}>
            <Icon />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <footer>
        <Link href="/detections">
          See recent detections <ArrowRight />
        </Link>
        <Link href="/benchmark">
          Inspect the frozen benchmark <ArrowRight />
        </Link>
        <Link href="/metrics">
          How we measure <ArrowRight />
        </Link>
      </footer>
    </section>
  );
}

function formatCount(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
