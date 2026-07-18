import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";
import { serverDb } from "@/lib/supabaseServer";
import { withReportUrl } from "@/lib/deepScan";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const db=await serverDb(); const {data:{user}}=await db.auth.getUser(); if(!user)return NextResponse.json({error:"Sign in to view scan progress."},{status:401});
    // The queue deliberately deduplicates work across users and catalog jobs.
    // Such a job can have a different (or no) requested_by value, so querying
    // through the user's RLS-scoped client makes a just-returned job ID appear
    // to vanish while it is still queued or running. The ID is only returned
    // by the authenticated queue endpoint; use the server-only client here to
    // expose its limited progress payload to that authenticated poller.
    const { data, error } = await serviceDb().from("scan_jobs").select("id,extension_id,version,profile,status,error,created_at,started_at,completed_at").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json(withReportUrl(data)) : NextResponse.json({ error: "Scan job not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan lookup failed." }, { status: 502 });
  }
}
