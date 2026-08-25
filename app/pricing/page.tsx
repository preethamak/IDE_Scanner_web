import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Check, Minus, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "../marketing.module.css";

type Cell = boolean | string;

const plans = [
  {
    id: "free",
    name: "Free",
    audience: "For individual developers",
    price: "$0",
    suffix: "free forever",
    description:
      "Know what an extension does before you install it. No account needed for public reports.",
    action: "Start with the registry",
    href: "/registry",
    badge: "",
    featured: false,
    features: [
      "Unlimited public exact-release reports",
      "Permission Passport and release diff",
      "Local inventory with the GuardRails CLI",
      "Watchlist for up to 3 extensions",
    ],
  },
  {
    id: "team",
    name: "Team",
    audience: "For teams sharing extensions",
    price: "$19",
    suffix: "per seat / month",
    description:
      "Stop re-reviewing releases from scratch. Every update arrives with the last decision attached.",
    action: "Start with your team",
    href: "/design-partners",
    badge: "Most popular",
    featured: true,
    features: [
      "Everything in Free, unlimited watchlist",
      "Alerts only when capabilities actually change",
      "Shared review inbox with owners and due dates",
      "Decision memory: approve once, reuse forever",
      "Audit export (CSV/JSON) for compliance",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    audience: "For governed organizations",
    price: "Custom",
    suffix: "annual agreement",
    description:
      "Roll extension policy out organization-wide with support from the team that builds the scanner.",
    action: "Book an intro call",
    href: "mailto:hello@abscissa.dev?subject=Enterprise%20intro%20call",
    badge: "",
    featured: false,
    features: [
      "Everything in Team, unlimited seats",
      "SSO and procurement support",
      "Organization-wide policy direction",
      "Longer audit retention",
      "Direct line to the founding team",
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
      ["Guided human review of a release", true, true, true],
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
      ["Seats included", "1", "5–100", "Unlimited"],
      ["Shared review inbox and assignments", false, true, true],
      ["Allow, block, and exception rationale", false, true, true],
      ["Decision memory across releases", false, true, true],
      ["Role-aware CSV and JSON audit export", false, true, true],
    ],
  },
  {
    group: "Organization",
    rows: [
      ["SSO and procurement support", false, false, true],
      ["Organization-wide policy direction", false, false, true],
      ["Extended audit retention", false, false, true],
      ["Private extension workflow planning", false, false, true],
      ["GuardRails IDE design partnership", false, false, true],
      ["Direct founding-team line and SLA", false, false, true],
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
            <ReceiptText /> Pricing and packaging
          </span>
          <h1>
            Scanning stays free.<em> Pay when a team depends on it.</em>
          </h1>
          <p>
            Check any extension for nothing, forever. Upgrade when release
            decisions need owners, notifications, and history your auditor can
            read.
          </p>
        </div>
        <aside>
          <ShieldCheck />
          <strong>Start small. Expand deliberately.</strong>
          <p>
            Public intelligence stays free forever. Team plans are priced per
            seat, and early-access customers keep their terms when billing
            switches on.
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
            {plan.href.startsWith("mailto:") ? (
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
                    <small>{plan.id === "team" ? "$19 /seat/mo" : plan.id === "free" ? "$0" : "Custom"}</small>
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
                  {group.rows.map(([label, free, team, enterprise]) => (
                    <tr key={`${group.group}-${label}`}>
                      <th scope="row">{label}</th>
                      <td><CellValue value={free} /></td>
                      <td data-plan="team"><CellValue value={team} /></td>
                      <td><CellValue value={enterprise} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.compareNote}>
          Guided reviews are provided free during the launch period. Early-access
          customers keep launch terms when billing switches on.
        </p>
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
            Use an enterprise agreement to shape governed rollout requirements
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
            workflow needs monitoring or team review. Want to talk it through?
            Book a 20-minute call with the founding team.
          </p>
        </div>
        <div className={styles.ctaActions}>
          <Link href="/registry">
            Search extensions <ArrowRight />
          </Link>
          <a href="mailto:hello@abscissa.dev?subject=Intro%20call%20(20%20min)">
            Book an intro call <ArrowRight />
          </a>
        </div>
      </section>
    </main>
  );
}
