import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json(); const email = String(body.work_email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || !String(body.name || "").trim() || !String(body.company || "").trim()) throw new Error("Name, company, and a valid work email are required.");
    const db = serviceDb(); const requester = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown"; const hash = createHash("sha256").update(`${process.env.SCAN_RATE_LIMIT_SECRET || "ide-scanner"}:${requester}`).digest("hex");
    const result = await db.rpc("submit_design_partner", { p_name:String(body.name),p_email:email,p_company:String(body.company),p_team_size:String(body.team_size||"unknown"),p_process:String(body.current_process||""),p_extension_count:String(body.extension_count||"unknown"),p_requester_hash:hash }); if(result.error) throw result.error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Submission failed.";
    console.error("[design-partners]", message);
    const configIssue = /credential|not configured|supabase/i.test(message) && !/required/i.test(message);
    if (configIssue) {
      return NextResponse.json(
        { error: "We could not record your request just now. Email hello@abscissa.dev and we will follow up directly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
