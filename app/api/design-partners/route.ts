import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json(); const email = String(body.work_email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || !String(body.name || "").trim() || !String(body.company || "").trim()) throw new Error("Name, company, and a valid work email are required.");
    const db = serviceDb(); const requester = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"; const hash = createHash("sha256").update(`${process.env.SCAN_RATE_LIMIT_SECRET || "ide-scanner"}:${requester}`).digest("hex"); const since = new Date(Date.now() - 86400000).toISOString();
    const recent = await db.from("product_events").select("id", { count: "exact", head: true }).eq("anonymous_id", hash).eq("name", "design_partner_submitted").gte("created_at", since); if ((recent.count || 0) >= 3) throw new Error("Submission limit reached. Contact the project through GitHub instead.");
    const result = await db.from("design_partner_leads").insert({ name: String(body.name).slice(0, 100), work_email: email.slice(0, 180), company: String(body.company).slice(0, 140), team_size: String(body.team_size || "unknown").slice(0, 50), current_process: String(body.current_process || "").slice(0, 2000), extension_count: String(body.extension_count || "unknown").slice(0, 50) }).select("id").single(); if (result.error) throw result.error;
    await db.from("product_events").insert({ anonymous_id: hash, name: "design_partner_submitted", properties: { lead_id: result.data.id } });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Submission failed." }, { status: 400 }); }
}
