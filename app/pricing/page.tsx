import Link from "next/link";
import { ArrowRight, Check, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

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
    price: "Preview",
    suffix: "packaging in progress",
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
    price: "Talk to us",
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
            Start with evidence.<em> Add teamwork when it matters.</em>
          </h1>
          <p>
            GuardRails packaging follows the product boundary: public
            intelligence stays useful, while collaboration, retention, and
            governance scale with the team.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>No pretend checkout</strong>
          <p>
            Billing and enforced entitlements are still being built. These cards
            describe the intended package—not a subscription you can purchase
            today.
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
          <span>Packaging boundary</span>
          <h2>What is available now—and what is not.</h2>
        </div>
        <ul>
          <li>
            Public reports, local report import, monitoring, and the current
            team workspace can be used today.
          </li>
          <li>
            Billing, plan limits, trials, checkout, and webhook reconciliation
            are not represented as complete.
          </li>
          <li>
            Enterprise runtime controls depend on the native GuardRails IDE
            roadmap and are not sold as finished features.
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
