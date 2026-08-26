import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import styles from "../trust.module.css";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "What GuardRails checks, where analysis runs, how monitoring works, what decisions mean, and what it costs.",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    question: "What does GuardRails actually check?",
    answer:
      "Published IDE extension releases. A report examines an exact release: requested permissions, capabilities that changed since the previous version, dependency additions, and the coverage of the evidence behind each finding. Findings are normalized into six scoring dimensions and mapped to a decision you can act on.",
    href: "/metrics",
    linkLabel: "Browse the detection catalog",
  },
  {
    question: "Do you install or execute extensions to scan them?",
    answer:
      "No. Website analysis inspects the published package without running it inside your editor. The local CLI examines extensions installed on your machine, and that analysis stays on your machine; nothing is uploaded unless you explicitly export a portable report.",
    href: "/analyze",
    linkLabel: "Choose an analysis path",
  },
  {
    question: "What do ALLOW, REVIEW, BLOCK, and INCOMPLETE mean?",
    answer:
      "They are the four report decisions. ALLOW means findings remained within normal behavior. REVIEW flags changes that warrant human judgment. BLOCK marks behavior that should stop an install or update in governed environments. INCOMPLETE indicates the analysis could not verify enough to decide; it represents a limit of the analysis rather than a pass.",
    href: "/scoring",
    linkLabel: "Read the scoring methodology",
  },
  {
    question: "Where does my imported report live?",
    answer:
      "In your browser. Report bundles dropped into Analyze or Reports are parsed and stored locally; the importer does not upload them. You remove them from the Reports library whenever you want.",
    href: "/reports",
    linkLabel: "Open the Reports library",
  },
  {
    question: "How does release monitoring decide what to tell me?",
    answer:
      "You select specific extensions to watch. When a new release is published, GuardRails compares its capability surface against previous versions and notifies you only about meaningful changes; re-publishes without behavioral change do not generate notifications. Delivery is available by email, Slack, Jira, or a weekly digest according to your workspace settings.",
    href: "/monitor",
    linkLabel: "See Release Monitoring",
  },
  {
    question: "Which editors are supported?",
    answer:
      "Analysis covers extensions published to marketplace registries used by editors such as VS Code, Cursor, and Windsurf. GuardRails is an independent reviewer; it is not affiliated with or endorsed by those platforms and does not modify your editors.",
    href: "/registry",
    linkLabel: "Search the registry",
  },
  {
    question: "How much does it cost?",
    answer:
      "All public analysis features are free, including exact-release reports, the registry, and the local CLI. Guided reviews and release monitoring are provided free of charge to early customers during the launch period. Team plans will be introduced afterward and priced through the design-partner program.",
    href: "/pricing",
    linkLabel: "See pricing",
  },
  {
    question: "How validated is the scanner itself?",
    answer:
      "Openly. A published benchmark runs the scanner against a reproducible corpus and states coverage and limitations alongside results, so you can see where detection is strong and where it is honest about gaps.",
    href: "/benchmark",
    linkLabel: "Review validation and limits",
  },
  {
    question: "How do I dispute a finding or flag a malicious extension?",
    answer:
      "Both are handled through the contact page. Report disputes should include the exact release link and describe what you believe was missed. Disputes are resolved through published corrections. Suspected malicious extensions can be reported to security@abscissa.dev for urgent review.",
    href: "/contact",
    linkLabel: "Contact the team",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function FaqPage() {
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            <CircleHelp /> Support
          </span>
          <h1>
            Frequently asked
            <br />
            <em>questions.</em>
          </h1>
          <p>
            Each answer links to the methodology pages that document the claim
            in full.
          </p>
          <div className={styles.actions}>
            <Link href="/registry">
              Check an extension now <ArrowRight />
            </Link>
            <Link href="/contact">Contact the team</Link>
          </div>
        </div>
        <div className={styles.assurance}>
          <header>
            <CircleHelp />
            <span>
              <small>Scope</small>
              <strong>Product, privacy, pricing</strong>
            </span>
          </header>
          <div>
            <span>Methodology claims</span>
            <strong>Always linked</strong>
          </div>
          <div>
            <span>Local analysis</span>
            <strong>Stays local</strong>
          </div>
          <div>
            <span>Free tier</span>
            <strong>Full public reports</strong>
          </div>
          <footer>
            <ArrowRight /> Additional questions can be sent to hello@abscissa.dev
          </footer>
        </div>
      </section>

      <section className={styles.boundaryList}>
        {faqs.map((faq) => (
          <article key={faq.question}>
            <header>
              <span>
                <CircleHelp />
              </span>
              <div>
                <h3>{faq.question}</h3>
              </div>
            </header>
            <div>
              <p>{faq.answer}</p>
              <Link href={faq.href}>
                {faq.linkLabel} <ArrowRight />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.linkRail}>
        <Link href="/scoring">
          <span>Scoring</span>
          <strong>Decisions, severities, and boundaries.</strong>
          <ArrowRight />
        </Link>
        <Link href="/settings">
          <span>Boundaries</span>
          <strong>What runs where, what is retained.</strong>
          <ArrowRight />
        </Link>
        <Link href="/terms">
          <span>Terms</span>
          <strong>The agreement, in plain language.</strong>
          <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
