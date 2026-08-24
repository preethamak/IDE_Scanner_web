import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "All public analysis features are free. Guided reviews and release monitoring are open to early customers during the launch period.",
  alternates: { canonical: "/pricing" },
};

const GUIDED_REVIEW_MAILTO =
  "mailto:hello@abscissa.dev?subject=Guided%20review%20request&body=Extension%20and%20release%20(marketplace%20link%20or%20ID)%3A%0AContext%3A";

const MONITORING_ACCESS_MAILTO =
  "mailto:hello@abscissa.dev?subject=Release%20Monitoring%20early%20access";

const tiers = [
  {
    name: "Scan",
    status: "Available to everyone",
    price: "$0",
    suffix: "Permanent free tier",
    description:
      "Analyze any published IDE extension release before installing it. These features remain free.",
    action: "Open the registry",
    href: "/registry",
    features: [
      "Public exact-release reports",
      "Permission Passport and release diff",
      "Local analysis with the GuardRails CLI",
      "Imported reports stored in your browser",
      "Personal watchlist for up to 3 extensions",
    ],
  },
  {
    name: "Guided review",
    status: "Limited slots each week",
    price: "Free",
    suffix: "Launch period",
    description:
      "Request an examination of a specific extension release. The GuardRails team reviews the exact package and provides a written summary of its behavior and changes.",
    action: "Request a review",
    href: GUIDED_REVIEW_MAILTO,
    external: true,
    featured: true,
    features: [
      "Manual examination of one exact release",
      "Dependency and capability-change analysis",
      "Findings stated plainly, including incomplete results",
      "Written summary suitable for sharing with your team",
    ],
  },
  {
    name: "Release Monitoring",
    status: "Early access",
    price: "Free",
    suffix: "For early customers",
    description:
      "Monitor the extensions your team depends on. New releases are analyzed automatically, and notifications are limited to meaningful capability changes.",
    action: "Join early access",
    href: MONITORING_ACCESS_MAILTO,
    external: true,
    features: [
      "Watchlist expansion beyond the free tier",
      "Notifications on meaningful capability changes only",
      "Email and Slack delivery targets",
      "Weekly digest and scan history",
    ],
  },
] as const;

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <i className={`${styles.glow} ${styles.glowOne}`} aria-hidden="true" />
      <i className={`${styles.glow} ${styles.glowTwo}`} aria-hidden="true" />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <ReceiptText /> Pricing
          </span>
          <h1>
            Scanning is free.
            <em> Paid plans will follow.</em>
          </h1>
          <p>
            All public analysis features cost nothing. During the launch
            period, guided reviews and release monitoring are provided free of
            charge to early customers. Team plans will be introduced afterward.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Billing is not enabled yet.</strong>
          <p>
            Early customers work directly with the founding team. Paid plans
            will be announced on this page when they become available.
          </p>
        </aside>
      </section>
      <section className={styles.plans}>
        {tiers.map((tier) => (
          <article
            className={`${styles.plan} ${
              "featured" in tier && tier.featured ? styles.featured : ""
            }`}
            key={tier.name}
          >
            <span>{tier.name}</span>
            <div className={styles.price}>
              <strong>{tier.price}</strong>
              <small>{tier.suffix}</small>
            </div>
            <p>{tier.description}</p>
            <ul>
              {tier.features.map((feature) => (
                <li key={feature}>
                  <Check />
                  {feature}
                </li>
              ))}
            </ul>
            {"external" in tier && tier.external ? (
              <a href={tier.href}>
                {tier.action}
                <ArrowRight />
              </a>
            ) : (
              <Link href={tier.href}>
                {tier.action}
                <ArrowRight />
              </Link>
            )}
          </article>
        ))}
      </section>
      <section className={styles.honesty}>
        <div>
          <span>Teams and organizations</span>
          <h2>Team plans are shaped with design partners.</h2>
        </div>
        <ul>
          <li>
            The team workspace provides a shared review inbox, decisions with
            owners, and audit export. Access is currently provided through the{" "}
            <Link href="/design-partners">design-partner program</Link>.
          </li>
          <li>
            Team pricing will be set based on how participating organizations
            use Guardrails in practice.
          </li>
        </ul>
      </section>
      <section className={styles.cta}>
        <div>
          <small>Get started</small>
          <h2>Inspect an extension first.</h2>
          <p>
            Public exact-release reports require no account. If the analysis is
            useful, the options above extend it further.
          </p>
        </div>
        <Link href="/registry">
          Search extensions <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
