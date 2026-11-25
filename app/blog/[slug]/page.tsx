import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publishedPosts } from "@/lib/admin/content";
import { blogMarkdown } from "@/lib/blogMarkdown";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = (await publishedPosts(slug).catch(() => []))[0];
  return post ? { title: post.title, description: post.summary, alternates: { canonical: `/blog/${post.slug}` } } : { title: "Article unavailable", robots: { index: false } };
}
export default async function Article({ params }: Props) {
  const { slug } = await params;
  const post = (await publishedPosts(slug))[0]; if (!post) notFound();
  return <main className="page" style={{ maxWidth: 820, margin: "0 auto", padding: "60px 24px" }}><Link href="/blog">← Abscissa journal</Link><article><p>{post.published_at?.slice(0, 10)} · Abscissa</p><h1>{post.title}</h1><p>{post.summary}</p><div className="ds-markdown" dangerouslySetInnerHTML={{ __html: blogMarkdown(post.body) }} /></article></main>;
}
