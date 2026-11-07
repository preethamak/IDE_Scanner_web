import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "Abscissa pricing | Developer security for teams",
  description:
    "Start using Abscissa with free extension reports. Team workspaces are in pilot; proposed Monitoring and Teams plans are $19 and $99 per month. Billing is not open.",
  alternates: { canonical: "/pricing" },
};

type Cell = boolean | string;

// Public extension reports are available now. Paid-plan prices describe proposed plans,
// not a purchasable service or a guaranteed enterprise feature commitment.
const plans = [
  {
    id: "scan",
    name: "Scan",
    audience: "For individual developers",
    price: "$0",
    suffix: "Free forever",
    tableSuffix: "Free forever",
    later: "",
    description:
      "Check what an extension can access before adding it to your editor. Start with five Deep Scan trials without creating an account.",
    action: "Open the registry",
    href: "/registry",
    external: false,
    featured: false,
    badge: "",
    features: [
      "Per-version public reports",
      "Five no-account Deep Scan trials per 30 days",
      "File, command, and network access report",
      "Local analysis with the GuardRails CLI",
      "Personal watchlist for up to 3 extensions",
      "Team pilot available by request",
    ],
  },
  {
    id: "monitoring",
    name: "Monitoring",
    audience: "For teams sharing extensions",
    price: "$19",
    suffix: "per month",
    tableSuffix: "$19/month",
    later: "Early access · billing not yet open",
    description:
      "Follow the extensions your team uses and check new versions against the one you reviewed. See when a scan is pending or has failed.",
    action: "Join early access",
    href: "/design-partners",
    external: false,
    featured: true,
    badge: "",
    features: [
      "Public reports and a shared watchlist",
      "Release-change notification settings",
      "Email and Slack delivery targets",
      "Weekly digest and scan history",
      "Shared review inbox, decisions with owners",
    ],
  },
  {
    id: "teams",
    name: "Teams",
    audience: "For teams with approval policies",
    price: "$99",
    suffix: "per month, up to 25 seats",
    tableSuffix: "$99/month",
    later: "Early access · billing not yet open",
    description:
      "Assign reviewers, keep approvals and exceptions, and export the team’s review history. Discuss organization requirements during the pilot.",
    action: "Talk to the founder",
    href: "/design-partners",
    external: false,
    featured: false,
    badge: "",
    features: [
      "Monitoring and team review workflow",
      "Allow, block, and exception decisions with reasons",
      "Review history for each version",
      "Role-aware CSV and JSON audit export",
      "API keys and bulk gate checks for CI",
      "Planned: organization SSO and custom retention",
    ],
  },
] as const;

const comparison: Array<{
  group: string;
  rows: Array<[string, Cell, Cell, Cell]>;
}> = [
  {
    group: "Extension scans and reports",
    rows: [
      ["Per-version public reports", true, true, true],
      ["No-account Deep Scan trial", "5 / 30 days", "5 / 30 days", "5 / 30 days"],
      ["Access reports and version comparison", true, true, true],
      ["GuardRails CLI local inventory", true, true, true],
      ["Guided human review of a release", "By arrangement", "By arrangement", "By arrangement"],
    ],
  },
  {
    group: "Monitoring",
    rows: [
      ["Watchlist size", "3 extensions", "Pilot limits agreed at setup", "Pilot limits agreed at setup"],
      ["Scheduled release checks and scan status", false, true, true],
      ["Release-change notification settings", false, true, true],
      ["Email and Slack delivery", false, true, true],
      ["Weekly digest and scan history", false, true, true],
    ],
  },
  {
    group: "Team workflow",
    rows: [
      ["Seats included", "1", "Up to 25", "Up to 25"],
      ["Shared review inbox and assignments", false, true, true],
      ["Allow, block, and exception decisions with reasons", false, false, true],
      ["Review history for each version", false, false, true],
      ["Role-aware CSV and JSON audit export", false, false, true],
      ["API keys and bulk gate checks (up to 200 releases/call)", false, true, true],
    ],
  },
  {
    group: "Organization",
    rows: [
      ["Organization SSO", false, false, "Planned · unavailable in pilot"],
      ["Shared extension approval policy", false, false, true],
      ["Custom audit retention", false, false, "Planned · scope with founder"],
      ["Private extension workflow planning", false, false, "Design-partner discussion"],
      ["Direct line to the founder", false, false, true],
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
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <ReceiptText /> Pricing
          </span>
          <h1>
            Start with your team’s extensions.<em> Review them with Abscissa.</em>
          </h1>
          <p>
            Abscissa’s public extension reports, registry, and GuardRails CLI are free.
            Use the team workspace to review extensions and follow updates during the pilot. The proposed paid
            plans are Monitoring at $19/month and Teams at $99/month for up to
            25 seats; neither plan can be purchased yet.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>No payment is possible yet.</strong>
          <p>
            Billing is not enabled. Pilot access and its limits are confirmed
            with your team before setup. Organization SSO and custom retention
            are planned work, not services available in the pilot.
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
            {plan.later ? (
              <small className={styles.planLater}>{plan.later}</small>
            ) : null}
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  {feature.startsWith("Planned:") ? <Minus /> : <Check />}
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
          <span>Public access and proposed team plans</span>
          <h2>What your team can use.</h2>
          <p>Team workspaces are available through the pilot. Confirm limits during setup; planned services are labelled below.</p>
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
                    <small>{plan.tableSuffix}</small>
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
          Public reports stay free. Monitoring and Teams show proposed prices
          for a future paid launch. No checkout is available; joining the pilot
          does not start a subscription.
        </p>
      </section>

      <section className={styles.honesty}>
        <div>
          <span>Teams and organizations</span>
          <h2>Set up Abscissa with your team.</h2>
        </div>
        <ul>
          <li>
            The team workspace provides a shared review inbox, decisions with
            owners, and audit export. Access is currently provided through the{" "}
            <Link href="/design-partners">design-partner program</Link>.
          </li>
          <li>
            Organization SSO, custom retention, and private extension requirements
            are discussed separately. Requesting them does not imply delivery
            is already available.
          </li>
        </ul>
      </section>

      <section className={styles.cta}>
        <div>
          <small>Start with your development tools</small>
          <h2>Check an extension your team already uses.</h2>
          <p>
            Public reports require no account. Want to talk it through? Ask for a
            20-minute call and the founder will reply directly.
          </p>
        </div>
        <div className={styles.ctaActions}>
          <Link href="/registry">
            Search extensions <ArrowRight />
          </Link>
          <Link href="/design-partners">
            Request a call <ArrowRight />
          </Link>
        </div>
      </section>
    </main>
  );
}
