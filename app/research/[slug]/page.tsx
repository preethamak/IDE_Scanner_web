import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { getResearch, researchArticles } from "@/lib/research";

export function generateStaticParams() { return researchArticles.map(({ slug }) => ({ slug })); }
export default async function ResearchArticlePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const article = getResearch(slug); if (!article) notFound(); return <main className="researchArticle"><Link className="backLink" href="/research"><ArrowLeft/> Research</Link><header><span>{article.category} · {article.published} · {article.reading}</span><h1>{article.title}</h1><p>{article.summary}</p></header><div className="articleLayout"><article>{article.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>)}</article><aside><ShieldCheck/><strong>Evidence-first publication</strong><p>This article describes the public scanner methodology. Individual extension conclusions remain tied to exact artifacts.</p><Link href="/metrics">Inspect the rule catalog <ArrowRight/></Link></aside></div></main>; }
