import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free public reports for individuals today, with team workspaces for shared release decisions and design-partner access for governed rollouts.",
  alternates: { canonical: "/pricing" },
};

const plans = [
  {
    name: "Free",
    price: "$0",
    suffix: "for individuals",
    description:
      "Inspect public extension reports and keep a small personal watchlist.",
    action: "Start with the registry",
    href: "/registry",
    features: [
      "Public exact-release reports",
      "Permission Passport and release diff",
      "Personal monitoring foundation",
      "Portable local CLI reports",
    ],
  },
  {
    name: "Team",
    price: "Early access",
    suffix: "for shared release decisions",
    description:
      "Coordinate release review, ownership, notifications, and defensible decisions.",
    action: "Use the team workspace",
    href: "/workspace",
    featured: true,
    features: [
      "Shared review inbox and assignments",
      "Allow, block, and exception rationale",
      "Email, Slack, and weekly digest",
      "Role-aware CSV and JSON audit export",
    ],
  },
  {
    name: "Business",
    price: "Design partner",
    suffix: "for governed environments",
    description:
      "Plan organization-wide policy and secure developer-environment rollout.",
    action: "Discuss your requirements",
    href: "/design-partners",
    features: [
      "Organization policy direction",
      "Longer audit retention planning",
      "Private extension workflow planning",
      "GuardRails IDE design partnership",
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
            Start with evidence.<em> Grow into a decision system.</em>
          </h1>
          <p>
            Start with a single tool. Add monitoring, shared decisions, and
            policy when your team is ready to make extension access intentional.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Start small. Expand deliberately.</strong>
          <p>
            Public intelligence stays open. Team access is introduced with a
            guided workspace rollout, not a forced enterprise contract.
          </p>
        </aside>
      </section>
      <section className={styles.plans}>
        {plans.map((plan) => (
          <article
            className={`${styles.plan} ${"featured" in plan ? styles.featured : ""}`}
            key={plan.name}
          >
            <span>{plan.name}</span>
            <div className={styles.price}>
              <strong>{plan.price}</strong>
              <small>{plan.suffix}</small>
            </div>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check />
                  {feature}
                </li>
              ))}
            </ul>
            <Link href={plan.href}>
              {plan.action}
              <ArrowRight />
            </Link>
          </article>
        ))}
      </section>
      <section className={styles.honesty}>
        <div>
          <span>How GuardRails grows with you</span>
          <h2>From one review to a team-wide trust boundary.</h2>
        </div>
        <ul>
          <li>
            Begin with public reports and one extension you want to understand.
          </li>
          <li>
            Move into the team workspace when decisions need owners, history,
            and meaningful-change notifications.
          </li>
          <li>
            Use a design partnership to shape governed rollout requirements
            around the way your engineering organisation actually works.
          </li>
        </ul>
      </section>
      <section className={styles.cta}>
        <div>
          <small>Need a practical starting point?</small>
          <h2>Inspect the extension first.</h2>
          <p>
            Open a public exact-release report before deciding whether your
            workflow needs monitoring or team review.
          </p>
        </div>
        <Link href="/registry">
          Search extensions <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
