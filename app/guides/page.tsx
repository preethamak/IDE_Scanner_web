import type { Metadata } from "next";
import Link from "next/link";
import { seoGuides } from "@/lib/seoGuides";
import styles from "../docs/docs.module.css";
export const metadata: Metadata = {
  title: "VS Code Extension Security Guides",
  description: "Practical guides to checking VS Code extension safety, inspecting VSIX packages, and building an evidence-backed extension allowlist for your team.",
  alternates: { canonical: "/guides" },
  openGraph: { title: "VS Code Extension Security Guides", description: "Practical extension review workflows for developers and security teams.", url: "/guides" },
};
export default function GuidesPage() {
  return <main className={styles.page}><div className={styles.inner}>
    <header className={styles.hero}><span className={styles.eyebrow}>GuardRails guides</span><h1>Review the code you add to your editor.</h1><p>Start with the question you need to answer, then follow a practical workflow from package identity to an evidence-backed decision.</p></header>
    <section className={styles.section}><h2>Extension security workflows</h2>{seoGuides.map(guide => <article key={guide.slug}><h3><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h3><p>{guide.description}</p></article>)}</section>
    <section className={styles.section}><h2>Put the review into practice</h2><p><Link href="/vscode-extension-security">Explore the extension security scanner</Link>, <Link href="/registry">look up exact-release evidence</Link>, or <Link href="/research">read our original research and case studies</Link>.</p></section>
  </div></main>;
}
