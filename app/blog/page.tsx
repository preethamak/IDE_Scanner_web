import Link from "next/link";
import type { Metadata } from "next";
import { publishedPosts } from "@/lib/admin/content";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Abscissa journal", description: "Release notes, extension security research, and product updates from Abscissa." };
export default async function Blog() {
  let posts; try { posts = await publishedPosts(); } catch { return <main className="page"><h1>Abscissa journal</h1><p>The journal is temporarily unavailable. Please try again later.</p></main>; }
  return <main className="page" style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px" }}><p>ABSCISSA JOURNAL</p><h1>Research and product notes.</h1>{!posts.length ? <p>Articles will appear here when published.</p> : posts.map(post => <article key={post.slug} style={{ padding: "30px 0", borderBottom: "1px solid #d7ded7" }}><small>{post.published_at?.slice(0, 10)}</small><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.summary}</p><Link href={`/blog/${post.slug}`}>Read article →</Link></article>)}</main>;
}
