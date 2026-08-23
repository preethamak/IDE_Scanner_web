import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Scanning IDE extensions is free today. A $19 human-reviewed Security Report and $9/month Release Monitoring open with founding rates for early customers.",
  alternates: { canonical: "/pricing" },
};

const REPORT_ORDER_MAILTO =
  "mailto:hello@abscissa.dev?subject=Security%20Report%20order&body=Extension%20to%20review%20(marketplace%20link%20or%20ID)%3A%0AAgree%20to%20the%20one-time%20report%20terms%3A%20yes";

const MONITORING_INVITE_MAILTO =
  "mailto:hello@abscissa.dev?subject=Release%20Monitoring%20early%20access";

const tiers = [
  {
    name: "Scan",
    status: "Available now",
    price: "$0",
    suffix: "free, for good",
    description:
      "Everything you need to judge a release before installing it. This tier stays free — it is how the evidence gets read.",
    action: "Open the registry",
    href: "/registry",
    features: [
      "Public exact-release reports",
      "Permission Passport and release diff",
      "Local analysis with the GuardRails CLI",
      "Browser-local imported reports",
      "Personal watchlist for 3 extensions",
    ],
  },
  {
    name: "Security Report",
    status: "Founding rate",
    price: "$19",
    suffix: "one-time, per extension",
    description:
      "When a release matters enough to have a person walk through it with you. Fulfilled directly by the founding team.",
    action: "Order by email",
    href: REPORT_ORDER_MAILTO,
    external: true,
    featured: true,
    features: [
      "Human-reviewed walkthrough of one exact release",
      "Dependency and capability-change analysis",
      "Plain-language verdict — INCOMPLETE called out, not hidden",
      "Portable report you can share with your team",
    ],
  },
  {
    name: "Release Monitoring",
    status: "Launch access",
    price: "$9",
    suffix: "per month, founding rate",
    description:
      "For extensions you rely on: every new release analyzed, and you hear only about changes that matter.",
    action: "Request launch access",
    href: MONITORING_INVITE_MAILTO,
    external: true,
    features: [
      "Up to 25 watched extensions (vs 3 on free)",
      "Alerts only on meaningful capability changes",
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
            <ReceiptText /> Pricing, stated plainly
          </span>
          <h1>
            Free while the evidence
            <em> earns your trust.</em>
          </h1>
          <p>
            Guardrails is in its founding-customer phase: scanning is free,
            paid help is fulfilled personally by the team, and early customers
            lock in founding rates. Prices are in US dollars.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Why these numbers.</strong>
          <p>
            They are set low while the product proves itself, and they buy you
            direct access to the people who build the scanner — not a support
            queue. Rates rise only when the evidence says they should.
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
          <span>What is deliberately missing</span>
          <h2>No team price tag. No enterprise tier. Yet.</h2>
        </div>
        <ul>
          <li>
            The team workspace — shared review inbox, decisions with owners,
            audit export — exists and is rolling out with guided onboarding.
            Its pricing gets set by design-partner conversations, not announced
            into the void.
          </li>
          <li>
            Self-serve billing arrives when the manual path stops scaling.
            Until then nothing here pretends to be a payment flow.
          </li>
        </ul>
      </section>
      <section className={styles.cta}>
        <div>
          <small>No account needed</small>
          <h2>Judge the product, not the price.</h2>
          <p>
            Open a public exact-release report right now. If the evidence is
            useful, the paid options above exist to go deeper.
          </p>
        </div>
        <Link href="/registry">
          Search extensions <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
