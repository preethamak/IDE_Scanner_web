import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { encryptTarget, outboundNotificationsConfigured } from "@/lib/notificationCrypto";
import { serviceDb } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const severities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]);

export async function GET(request: Request) {
  try {
    const { user } = await authenticated(request);
    const { data, error } = await serviceDb().from("notification_channels").select("id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at").eq("owner_id", user.id).order("created_at");
    if (error) throw error;
    return NextResponse.json({ configured: outboundNotificationsConfigured(), channels: data || [] });
  } catch (error) { return failure(error, 401); }
}

export async function POST(request: Request) {
  try {
    const { user } = await authenticated(request);
    if (!outboundNotificationsConfigured()) return NextResponse.json({ error: "Outbound notifications are not configured by the service operator." }, { status: 503 });
    const body = await request.json();
    const target = String(body.webhook_url || "").trim();
    const label = String(body.label || "Slack alerts").trim().slice(0, 80);
    const minimumSeverity = String(body.minimum_severity || "MEDIUM").toUpperCase();
    if (!isSlackWebhook(target)) return NextResponse.json({ error: "Enter a valid hooks.slack.com incoming webhook URL." }, { status: 400 });
    if (!label) return NextResponse.json({ error: "Channel name is required." }, { status: 400 });
    if (!severities.has(minimumSeverity)) return NextResponse.json({ error: "Invalid severity threshold." }, { status: 400 });
    const validation = await sendSlack(target, { text: "IDE Scanner notifications connected. New watched-release evidence will be delivered here." });
    if (!validation.ok) return NextResponse.json({ error: "Slack rejected this webhook. Confirm it is active and try again." }, { status: 400 });
    const { data, error } = await serviceDb().from("notification_channels").insert({ owner_id: user.id, kind: "slack_webhook", label, target_encrypted: encryptTarget(target), minimum_severity: minimumSeverity, last_validated_at: new Date().toISOString() }).select("id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return failure(error, 400); }
}

export async function DELETE(request: Request) {
  try {
    const { user } = await authenticated(request);
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!id) return NextResponse.json({ error: "Channel id is required." }, { status: 400 });
    const { error } = await serviceDb().from("notification_channels").delete().eq("id", id).eq("owner_id", user.id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) { return failure(error, 400); }
}

function isSlackWebhook(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "hooks.slack.com" && /^\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/.test(url.pathname); }
  catch { return false; }
}
async function sendSlack(url: string, body: Record<string, unknown>) { return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) }); }
function failure(error: unknown, status: number) { return NextResponse.json({ error: error instanceof Error ? error.message : "Notification request failed." }, { status }); }
