import "server-only";
import { auditedMutation, OperationError } from "./mutations";
import { randomUUID } from "node:crypto";
import { privateDb } from "@/lib/cloudflarePrivate";
export type BlogPost = { id: string; slug: string; title: string; summary: string; body: string; status: string; version: number; updated_at: string; published_at: string | null; created_at: string; created_by: string };
export class ContentError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}
export function validatePost(input: Record<string, unknown>) {
  const text = (key: string, min: number, max: number) => {
    const value = input[key];
    if (typeof value !== "string" || value.trim().length < min || value.length > max) throw new ContentError(`Invalid ${key}.`);
    return value.trim();
  };
  const slug = text("slug", 1, 100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ContentError("Use lowercase words separated by hyphens for the slug.");
  if (!["draft", "published"].includes(String(input.status))) throw new ContentError("Invalid publication status.");
  return { slug, title: text("title", 1, 160), summary: text("summary", 0, 400), body: text("body", 1, 100_000), status: String(input.status) };
}
export async function savePost(input: Record<string, unknown>, userId: string) {
  const post = validatePost(input); const db = privateDb(); const now = new Date().toISOString();
  const id = typeof input.id === "string" && input.id ? input.id : randomUUID();
  try {
    if (input.id) {
      if (!Number.isSafeInteger(input.version) || Number(input.version) < 1) throw new ContentError("A current version is required.");
      const statement = db.prepare(`UPDATE app_blog_posts SET slug=?,title=?,summary=?,body=?,status=?,version=version+1,updated_at=?,published_at=CASE WHEN ?='published' THEN coalesce(published_at,?) ELSE NULL END WHERE id=? AND version=?`).bind(post.slug, post.title, post.summary, post.body, post.status, now, post.status, now, id, input.version);
      await auditedMutation(statement,userId,"blog.update",id,{status:post.status});
    } else {
      const statement = db.prepare("INSERT INTO app_blog_posts(id,slug,title,summary,body,status,created_by,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id, post.slug, post.title, post.summary, post.body, post.status, userId, now, now, post.status === "published" ? now : null);
      await auditedMutation(statement,userId,"blog.create",id,{status:post.status});
    }
  } catch (error) {
    if (error instanceof ContentError) throw error;
    if (error instanceof OperationError) throw new ContentError(error.message,error.status);
    if (/unique/i.test(String(error))) throw new ContentError("That slug is already in use.", 409);
    throw error;
  }
  return db.prepare("SELECT * FROM app_blog_posts WHERE id=?").bind(id).first<BlogPost>();
}
export async function publishedPosts(slug?: string) {
  const db = privateDb();
  return slug
    ? (await db.prepare("SELECT slug,title,summary,body,published_at FROM app_blog_posts WHERE status='published' AND slug=? LIMIT 1").bind(slug).all<BlogPost>()).results
    : (await db.prepare("SELECT slug,title,summary,published_at FROM app_blog_posts WHERE status='published' ORDER BY published_at DESC LIMIT 100").all<BlogPost>()).results;
}
