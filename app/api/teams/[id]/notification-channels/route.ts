import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { encryptTarget, outboundNotificationsConfigured } from "@/lib/notificationCrypto";
import { serviceDb } from "@/lib/supabase";

const severities = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]);

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const { data, error } = await serviceDb().from("team_notification_channels").select("id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at").eq("team_id", id).order("created_at");
    if (error) throw error;
    return NextResponse.json({ configured: outboundNotificationsConfigured(), channels: data || [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Channel lookup failed." }, { status: 403 }); }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    if (!outboundNotificationsConfigured()) return NextResponse.json({ error: "Outbound notifications are not configured by the service operator." }, { status: 503 });
    const body = await request.json(); const url = String(body.webhook_url || "").trim(); const label = String(body.label || "Security alerts").trim().slice(0, 80); const severity = String(body.minimum_severity || "MEDIUM").toUpperCase();
    if (!isSlackWebhook(url) || !label || !severities.has(severity)) return NextResponse.json({ error: "Provide a valid Slack webhook, channel name, and severity." }, { status: 400 });
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "GuardRails team notifications connected." }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return NextResponse.json({ error: "Slack rejected this webhook." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_notification_channels").insert({ team_id: id, kind: "slack_webhook", label, target_encrypted: encryptTarget(url), minimum_severity: severity, last_validated_at: new Date().toISOString() }).select("id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Channel creation failed." }, { status: 403 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await authenticated(request); const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const channelId = new URL(request.url).searchParams.get("channel_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(channelId)) return NextResponse.json({ error: "A valid channel id is required." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_notification_channels").delete().eq("id", channelId).eq("team_id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Notification channel not found." }, { status: 404 });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Channel removal failed." }, { status: 403 }); }
}

function isSlackWebhook(value: string) { try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "hooks.slack.com" && /^\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/.test(url.pathname); } catch { return false; } }
