import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Scanning IDE extensions is free, for good. Guided reviews and release monitoring are open to early customers while Guardrails proves itself.",
  alternates: { canonical: "/pricing" },
};

const GUIDED_REVIEW_MAILTO =
  "mailto:hello@abscissa.dev?subject=Guided%20review%20request&body=Extension%20and%20release%20to%20walk%20through%20(marketplace%20link%20or%20ID)%3A%0AWhat%20decision%20hinges%20on%20it%3A";

const MONITORING_ACCESS_MAILTO =
  "mailto:hello@abscissa.dev?subject=Release%20Monitoring%20early%20access";

const tiers = [
  {
    name: "Scan",
    status: "Available now",
    price: "$0",
    suffix: "free, for good",
    description:
      "Everything you need to judge a release before installing it. This tier stays free — it is how the evidence earns trust.",
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
    name: "Guided review",
    status: "Free during launch · limited slots each week",
    price: "Free",
    suffix: "while Guardrails is young",
    description:
      "Send us an extension that matters to you. The person who built the scanner walks your team through what it does and what changed, and you keep the written summary.",
    action: "Request a guided review",
    href: GUIDED_REVIEW_MAILTO,
    external: true,
    featured: true,
    features: [
      "A person examines one exact release with you",
      "Dependency and capability-change walkthrough",
      "Plain-language verdict — INCOMPLETE called out, not hidden",
      "Written summary you can share with your team",
    ],
  },
  {
    name: "Release Monitoring",
    status: "Early access",
    price: "Free",
    suffix: "for founding members",
    description:
      "Watch the extensions you rely on. Every new release gets analyzed, and you hear only about changes that matter.",
    action: "Join early access",
    href: MONITORING_ACCESS_MAILTO,
    external: true,
    features: [
      "More watched extensions than the free tier",
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
            <ReceiptText /> Access and availability
          </span>
          <h1>
            Free today.<em> Priced together, later.</em>
          </h1>
          <p>
            Scanning stays free for everyone. Deeper help is open to early
            customers while Guardrails is young — and paid tiers will be
            shaped with the people who actually use them.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>No price theater.</strong>
          <p>
            Self-serve billing does not exist yet, so nothing here pretends
            otherwise. Early customers talk directly to the founding team —
            and help set what paid plans look like when they arrive.
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
          <span>For teams and organizations</span>
          <h2>Designed with design partners, priced with them too.</h2>
        </div>
        <ul>
          <li>
            The team workspace — shared review inbox, decisions with owners,
            audit export — is rolling out with guided onboarding through the{" "}
            <Link href="/design-partners">design-partner program</Link>.
          </li>
          <li>
            What team plans cost gets decided in those conversations, based on
            how teams actually use Guardrails — not announced before it is
            known.
          </li>
        </ul>
      </section>
      <section className={styles.cta}>
        <div>
          <small>No account needed</small>
          <h2>Start with a release you care about.</h2>
          <p>
            Open a public exact-release report right now. If the evidence is
            useful, everything above exists to go deeper with us.
          </p>
        </div>
        <Link href="/registry">
          Search extensions <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
