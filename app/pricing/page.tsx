import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free with public exact-release reports, order a $19 human-reviewed Security Report, or get launch access to $9/month Release Monitoring.",
  alternates: { canonical: "/pricing" },
};

const REPORT_ORDER_MAILTO =
  "mailto:hello@abscissa.dev?subject=Security%20Report%20order&body=Extension%20to%20review%20(marketplace%20link%20or%20ID)%3A%0AAgree%20to%20the%20one-time%20report%20terms%3A%20yes";

const MONITORING_INVITE_MAILTO =
  "mailto:hello@abscissa.dev?subject=Release%20Monitoring%20early%20access";

const offers = [
  {
    name: "Scan",
    price: "$0",
    suffix: "always free",
    description:
      "Inspect any published extension release before you install it.",
    action: "Open the registry",
    href: "/registry",
    features: [
      "Public exact-release reports",
      "Permission Passport and release diff",
      "Local analysis with the GuardRails CLI",
      "Personal watchlist for 3 extensions",
    ],
  },
  {
    name: "Security Report",
    price: "$19",
    suffix: "one-time, per extension",
    description:
      "A human-reviewed deep read of one exact release, delivered as evidence you can act on.",
    action: "Order by email",
    href: REPORT_ORDER_MAILTO,
    external: true,
    featured: true,
    features: [
      "Everything in Scan, examined by a person",
      "Behavioral walkthrough of what the release does",
      "Dependency and capability-change notes",
      "Plain-language verdict, with INCOMPLETE called out honestly",
      "Portable report you can share with your team",
    ],
  },
  {
    name: "Release Monitoring",
    price: "$9",
    suffix: "per month",
    description:
      "Watch the extensions you trust and hear only about meaningful changes.",
    action: "Request launch access",
    href: MONITORING_INVITE_MAILTO,
    external: true,
    features: [
      "Automatic analysis of every new release",
      "Alerts only when capability actually changes",
      "Email and Slack delivery targets",
      "Weekly digest of watched-extension activity",
      "Scan history with downloadable reports",
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
            <ReceiptText /> Pricing and packaging
          </span>
          <h1>
            Start with evidence.<em> Pay when it saves you a decision.</em>
          </h1>
          <p>
            Prices are in US dollars. Scanning public releases costs nothing;
            you pay for human review, or for watching releases continuously.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Launch-stage pricing.</strong>
          <p>
            Paid offers are fulfilled directly by the founding team while
            billing automation ships — you always know who you are paying and
            what arrives next.
          </p>
        </aside>
      </section>
      <section className={styles.plans}>
        {offers.map((offer) => (
          <article
            className={`${styles.plan} ${
              "featured" in offer && offer.featured ? styles.featured : ""
            }`}
            key={offer.name}
          >
            <span>{offer.name}</span>
            <div className={styles.price}>
              <strong>{offer.price}</strong>
              <small>{offer.suffix}</small>
            </div>
            <p>{offer.description}</p>
            <ul>
              {offer.features.map((feature) => (
                <li key={feature}>
                  <Check />
                  {feature}
                </li>
              ))}
            </ul>
            {"external" in offer && offer.external ? (
              <a href={offer.href}>
                {offer.action}
                <ArrowRight />
              </a>
            ) : (
              <Link href={offer.href}>
                {offer.action}
                <ArrowRight />
              </Link>
            )}
          </article>
        ))}
      </section>
      <section className={styles.honesty}>
        <div>
          <span>For teams, after individuals work</span>
          <h2>Shared review and organization policy come next.</h2>
        </div>
        <ul>
          <li>
            The team workspace — shared review inbox, decisions with owners,
            audit export — is rolling out with guided onboarding rather than a
            self-serve price tag. Talk to us through the design-partner form.
          </li>
          <li>
            Higher tiers will be shaped by what launch customers actually use,
            not announced before they exist.
          </li>
        </ul>
      </section>
      <section className={styles.cta}>
        <div>
          <small>Need a practical starting point?</small>
          <h2>Inspect the extension first.</h2>
          <p>
            Open a public exact-release report before deciding whether your
            workflow needs human review or continuous monitoring.
          </p>
        </div>
        <Link href="/registry">
          Search extensions <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
