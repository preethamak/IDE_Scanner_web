import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { seoGuides } from "@/lib/seoGuides";
import styles from "../../docs/docs.module.css";
// This host uses a stateless incremental cache: render articles on demand.
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = seoGuides.find(item => item.slug === slug);
  if (!guide) return { title: "Guide not found", robots: { index: false } };
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${slug}` }, openGraph: { type: "article", title: guide.title, description: guide.description, url: `/guides/${slug}` } };
}
export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = seoGuides.find(item => item.slug === slug);
  if (!guide) notFound();
  const url = `https://abscissa.dev/guides/${slug}`;
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", "@id": `${url}#article`, headline: guide.title, description: guide.description, mainEntityOfPage: url, author: { "@type": "Organization", name: "Abscissa", url: "https://abscissa.dev/about" }, publisher: { "@type": "Organization", name: "Abscissa", url: "https://abscissa.dev" } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Guides", item: "https://abscissa.dev/guides" }, { "@type": "ListItem", position: 2, name: guide.title, item: url }] }
  ] };
  return <main className={styles.page}><div className={styles.inner}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
    <nav aria-label="Breadcrumb"><Link href="/guides">Extension security guides</Link></nav>
    <header className={styles.hero}><span className={styles.eyebrow}>By Abscissa · Practical guide</span><h1>{guide.title}</h1><p>{guide.description}</p><Link href={guide.action}>{guide.actionLabel} →</Link></header>
    <nav className={styles.toc} aria-label="On this page">{guide.sections.map(([heading], index) => <a key={heading} href={`#step-${index + 1}`}>{heading}</a>)}</nav>
    <article>{guide.sections.map(([heading, paragraphs], index) => <section className={styles.section} id={`step-${index + 1}`} key={heading}><h2>{heading}</h2>{paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}</article>
    <section className={styles.section}><h2>Sources and further reading</h2><ul>{guide.sources.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul><p>For an example of artifact verification changing a conclusion, read <Link href="/research/redhat-fabric8-analytics-false-positive">our Red Hat Fabric8 Analytics case study</Link>. Review the <Link href="/benchmark">validation boundaries</Link> before relying on a scan result.</p></section>
    <section className={styles.section}><h2>Keep a review record</h2><p><a href="/templates/extension-security-review.csv" download>Download the extension security review template (CSV)</a>. Record one artifact per row and keep unresolved questions visible.</p></section>
    <section className={styles.section}><h2>Continue your review</h2><p><Link href={guide.action}>{guide.actionLabel}</Link> · <Link href="/vscode-extension-security">How GuardRails scans extension packages</Link></p><ul>{seoGuides.filter(item => item.slug !== slug).map(item => <li key={item.slug}><Link href={`/guides/${item.slug}`}>{item.title}</Link></li>)}</ul></section>
  </div></main>;
}
