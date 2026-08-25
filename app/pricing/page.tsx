import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "All public analysis features are free. Guided reviews and release monitoring are open to early customers during the launch period.",
  alternates: { canonical: "/pricing" },
};

const MONITORING_ACCESS_MAILTO =
  "mailto:hello@abscissa.dev?subject=Release%20Monitoring%20early%20access";

const INTRO_CALL_MAILTO =
  "mailto:hello@abscissa.dev?subject=Intro%20call%20(20%20min)";

type Cell = boolean | string;

const plans = [
  {
    id: "scan",
    name: "Scan",
    audience: "For individual developers",
    price: "$0",
    suffix: "Free forever",
    description:
      "Know what an extension does before you install it. No account needed for public reports.",
    action: "Open the registry",
    href: "/registry",
    external: false,
    featured: false,
    badge: "",
    features: [
      "Public exact-release reports",
      "Permission Passport and release diff",
      "Local analysis with the GuardRails CLI",
      "Personal watchlist for up to 3 extensions",
      "Guided human reviews during launch",
    ],
  },
  {
    id: "monitoring",
    name: "Release Monitoring",
    audience: "For teams sharing extensions",
    price: "Free",
    suffix: "Launch period · early access",
    description:
      "Stop re-reviewing releases from scratch. Every update arrives analyzed, with only meaningful capability changes surfaced.",
    action: "Join early access",
    href: MONITORING_ACCESS_MAILTO,
    external: true,
    featured: true,
    badge: "Most popular",
    features: [
      "Everything in Scan, unlimited watchlist",
      "Notifications on meaningful changes only",
      "Email and Slack delivery targets",
      "Weekly digest and scan history",
      "Shared review inbox, decisions with owners",
    ],
  },
  {
    id: "teams",
    name: "Teams",
    audience: "For governed organizations",
    price: "Custom",
    suffix: "Shaped with design partners",
    description:
      "Roll extension policy out organization-wide, with decisions your auditor can read and support from the founding team.",
    action: "Book an intro call",
    href: INTRO_CALL_MAILTO,
    external: true,
    featured: false,
    badge: "",
    features: [
      "Everything in Release Monitoring",
      "Allow, block, and exception rationale",
      "Decision memory across releases",
      "Role-aware CSV and JSON audit export",
      "SSO, policy direction, extended retention",
    ],
  },
] as const;

const comparison: Array<{
  group: string;
  rows: Array<[string, Cell, Cell, Cell]>;
}> = [
  {
    group: "Scanning and evidence",
    rows: [
      ["Public exact-release reports", true, true, true],
      ["Permission Passport and capability diff", true, true, true],
      ["GuardRails CLI local inventory", true, true, true],
      ["Guided human review of a release", "Launch period", true, true],
    ],
  },
  {
    group: "Monitoring",
    rows: [
      ["Watchlist size", "3 extensions", "Unlimited", "Unlimited"],
      ["Automatic analysis of new releases", false, true, true],
      ["Notifications on meaningful changes only", false, true, true],
      ["Email and Slack delivery", false, true, true],
      ["Weekly digest and scan history", false, true, true],
    ],
  },
  {
    group: "Team workflow",
    rows: [
      ["Seats included", "1", "Small teams", "Unlimited"],
      ["Shared review inbox and assignments", false, true, true],
      ["Allow, block, and exception rationale", false, false, true],
      ["Decision memory across releases", false, false, true],
      ["Role-aware CSV and JSON audit export", false, false, true],
    ],
  },
  {
    group: "Organization",
    rows: [
      ["SSO and procurement support", false, false, true],
      ["Organization-wide policy direction", false, false, true],
      ["Extended audit retention", false, false, true],
      ["Private extension workflow planning", false, false, true],
      ["Direct founding-team line", false, true, true],
    ],
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true)
    return (
      <span className={styles.cellYes}>
        <Check /> Included
      </span>
    );
  if (value === false)
    return (
      <span className={styles.cellNo}>
        <Minus />
      </span>
    );
  return <span className={styles.cellText}>{value}</span>;
}

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
            Scanning is free.<em> Pay when a team depends on it.</em>
          </h1>
          <p>
            All public analysis features cost nothing. During the launch period,
            guided reviews and release monitoring are provided free of charge to
            early customers. Team plans will be introduced afterward.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Billing is not enabled yet.</strong>
          <p>
            Early customers work directly with the founding team and keep their
            launch terms when billing switches on.
          </p>
        </aside>
      </section>

      <section className={styles.plans}>
        {plans.map((plan) => (
          <article
            className={`${styles.plan} ${plan.featured ? styles.featured : ""}`}
            key={plan.id}
          >
            <div className={styles.planHead}>
              <span>{plan.name}</span>
              {plan.badge ? (
                <em className={styles.planBadge}>{plan.badge}</em>
              ) : null}
            </div>
            <small className={styles.audience}>{plan.audience}</small>
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
            {plan.external ? (
              <a href={plan.href}>
                {plan.action}
                <ArrowRight />
              </a>
            ) : (
              <Link href={plan.href}>
                {plan.action}
                <ArrowRight />
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className={styles.compareSection}>
        <header className={styles.sectionHead}>
          <span>Compare every detail</span>
          <h2>What you get on each plan.</h2>
        </header>
        <div className={styles.compareScroll}>
          <table className={styles.compare}>
            <thead>
              <tr>
                <th scope="col">
                  <span className="visually-hidden">Feature</span>
                </th>
                {plans.map((plan) => (
                  <th scope="col" key={plan.id} data-plan={plan.id}>
                    <strong>{plan.name}</strong>
                    <small>{plan.suffix}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((group) => (
                <Fragment key={group.group}>
                  <tr className={styles.groupRow}>
                    <td colSpan={4}>{group.group}</td>
                  </tr>
                  {group.rows.map(([label, scan, monitoring, teams]) => (
                    <tr key={`${group.group}-${label}`}>
                      <th scope="row">{label}</th>
                      <td><CellValue value={scan} /></td>
                      <td data-plan="monitoring"><CellValue value={monitoring} /></td>
                      <td><CellValue value={teams} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.compareNote}>
          Guided reviews are provided free during the launch period. Early-access
          customers keep launch terms when billing switches on. Team pricing will
          be set with design partners based on how organizations use Guardrails in
          practice.
        </p>
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
            Team pricing will be set based on how participating organizations use
            Guardrails in practice.
          </li>
        </ul>
      </section>

      <section className={styles.cta}>
        <div>
          <small>Get started</small>
          <h2>Inspect an extension first.</h2>
          <p>
            Public exact-release reports require no account. Want to talk it
            through? Book a 20-minute call with the founding team.
          </p>
        </div>
        <div className={styles.ctaActions}>
          <Link href="/registry">
            Search extensions <ArrowRight />
          </Link>
          <a href={INTRO_CALL_MAILTO}>
            Book an intro call <ArrowRight />
          </a>
        </div>
      </section>
    </main>
  );
}
