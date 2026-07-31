import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { requireTeamRole } from "@/lib/teams";
import { encryptTarget, outboundNotificationsConfigured } from "@/lib/notificationCrypto";
import { serviceDb } from "@/lib/supabase";
import { isSafeWebhookUrl } from "@/lib/teamNotificationPayload";
import { jiraAuthorization, parseJiraTarget } from "@/lib/jiraNotification";
import { emailDeliveryConfigured, isNotificationEmail } from "@/lib/emailNotification";

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
    const body = await request.json(); const url = String(body.webhook_url || "").trim(); const kind = String(body.kind || "slack_webhook"); const label = String(body.label || "Security alerts").trim().slice(0, 80); const severity = String(body.minimum_severity || "MEDIUM").toUpperCase();
    const jira = { site: String(body.jira_site || "").trim().replace(/\/$/, ""), email: String(body.jira_email || "").trim(), api_token: String(body.jira_api_token || "").trim(), project_key: String(body.jira_project_key || "").trim().toUpperCase() }; const email = String(body.email || "").trim().toLowerCase();
    if (kind === "email_resend" && !emailDeliveryConfigured()) return NextResponse.json({ error: "Email delivery is not configured by the service operator." }, { status: 503 });
    const validTarget = kind === "slack_webhook" ? isSlackWebhook(url) : kind === "generic_webhook" ? isSafeWebhookUrl(url) : kind === "jira_cloud" ? (() => { try { parseJiraTarget(JSON.stringify(jira)); return true; } catch { return false; } })() : kind === "email_resend" ? isNotificationEmail(email) : false;
    if (!label || !severities.has(severity) || !validTarget) return NextResponse.json({ error: "Provide a valid notification type, target, channel name, and severity." }, { status: 400 });
    const response = kind === "email_resend" ? new Response(null, { status: 204 }) : kind === "jira_cloud"
      ? await fetch(`${jira.site}/rest/api/3/myself`, { redirect: "error", headers: { Authorization: jiraAuthorization(jira), Accept: "application/json", "User-Agent": "GuardRails-Notification-Validator/1.0" }, signal: AbortSignal.timeout(10_000) })
      : await fetch(url, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", "User-Agent": "GuardRails-Notification-Validator/1.0" }, body: JSON.stringify(kind === "slack_webhook" ? { text: "GuardRails team notifications connected." } : { event: "guardrails.channel_verified", message: "GuardRails team notifications connected." }), signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return NextResponse.json({ error: "The notification endpoint rejected validation." }, { status: 400 });
    const { data, error } = await serviceDb().from("team_notification_channels").insert({ team_id: id, kind, label, target_encrypted: encryptTarget(kind === "jira_cloud" ? JSON.stringify(jira) : kind === "email_resend" ? email : url), minimum_severity: severity, last_validated_at: new Date().toISOString() }).select("id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at").single();
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
