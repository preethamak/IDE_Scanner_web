"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/admin/content";
const blank = { id: "", slug: "", title: "", summary: "", body: "", status: "draft", version: 0 };
export default function ContentEditor({ posts }: { posts: { id: string; title: string; status: string }[] }) {
  const [draft, setDraft] = useState(blank); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const router = useRouter();
  async function load(id: string) {
    if (!id) { setDraft(blank); setMessage(""); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/content?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const post = await response.json() as BlogPost & { error?: string };
      if (!response.ok) throw new Error(post.error || "Article could not be loaded.");
      setDraft({ id: post.id, slug: post.slug, title: post.title, summary: post.summary, body: post.body, status: post.status, version: post.version });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Article could not be loaded."); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const post = await response.json() as BlogPost & { error?: string };
      if (!response.ok) throw new Error(post.error || "Article could not be saved.");
      setDraft({ id: post.id, slug: post.slug, title: post.title, summary: post.summary, body: post.body, status: post.status, version: post.version });
      setMessage(post.status === "published" ? "Article published." : "Draft saved. The article is not public."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Article could not be saved."); }
    finally { setBusy(false); }
  }
  return <section className="adminPanel"><header className="adminPanelHead"><h2>Article editor</h2><span>Markdown · version {draft.version || "new"}</span></header><form className="adminEditor" onSubmit={save}>
    <label>Open article<select aria-label="Open article" value={draft.id} disabled={busy} onChange={event => void load(event.target.value)}><option value="">New article</option>{posts.map(post => <option key={post.id} value={post.id}>{post.title} ({post.status})</option>)}{draft.id && !posts.some(post => post.id === draft.id) ? <option value={draft.id}>{draft.title}</option> : null}</select></label>
    <label>Title<input required maxLength={160} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
    <label>URL slug<input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="extension-update-review" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value })} /></label>
    <label>Summary<textarea maxLength={400} rows={2} value={draft.summary} onChange={event => setDraft({ ...draft, summary: event.target.value })} /></label>
    <label>Article<textarea required maxLength={100000} rows={16} value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} /></label>
    <label>Visibility<select aria-label="Visibility" value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}><option value="draft">Draft · private</option><option value="published">Published · public on /blog</option></select></label>
    <div className="adminEditorActions"><button className="adminPrimary" disabled={busy}>{busy ? "Saving / loading…" : draft.status === "published" ? "Save and publish" : "Save draft"}</button>{draft.status === "published" && draft.id ? <a href={`/blog/${draft.slug}`} target="_blank" rel="noopener noreferrer">View public article ↗</a> : null}</div>
    <p role="status" aria-live="polite">{message}</p>
  </form></section>;
}
