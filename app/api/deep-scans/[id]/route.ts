import { NextResponse } from "next/server";
import { serviceDb } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { data, error } = await serviceDb().from("scan_jobs").select("id,extension_id,version,profile,status,error,created_at,started_at,completed_at").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? NextResponse.json(data) : NextResponse.json({ error: "Scan job not found." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Scan lookup failed." }, { status: 502 });
  }
}
