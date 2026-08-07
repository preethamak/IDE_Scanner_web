import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import {
  emailDeliveryConfigured,
  isNotificationEmail,
} from "@/lib/emailNotification";
import { jiraAuthorization, parseJiraTarget } from "@/lib/jiraNotification";
import {
  encryptTarget,
  outboundNotificationsConfigured,
} from "@/lib/notificationCrypto";
import { teamApiError } from "@/lib/teamApiError";
import { requireTeamRole } from "@/lib/teams";
import { serviceDb } from "@/lib/supabase";
import { isSafeWebhookUrl } from "@/lib/teamNotificationPayload";
import { requireEntitlement } from "@/lib/entitlements";

const severities = new Set([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFORMATIONAL",
]);
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin", "analyst", "viewer"]);
    const db = serviceDb();
    const [channelResult, deliveryResult, digestResult] = await Promise.all([
      db
        .from("team_notification_channels")
        .select(
          "id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at",
        )
        .eq("team_id", id)
        .order("created_at"),
      db
        .from("team_notification_deliveries")
        .select(
          "id,channel_id,status,attempts,delivered_at,last_error,next_attempt_at,created_at",
        )
        .eq("team_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("team_digest_deliveries")
        .select(
          "id,channel_id,status,delivered_at,last_error,period_start,period_end,created_at",
        )
        .eq("team_id", id)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    if (channelResult.error) throw channelResult.error;
    if (deliveryResult.error) throw deliveryResult.error;
    if (digestResult.error) throw digestResult.error;
    return NextResponse.json({
      configured: outboundNotificationsConfigured(),
      channels: channelResult.data || [],
      deliveries: deliveryResult.data || [],
      digest_deliveries: digestResult.data || [],
    });
  } catch (error) {
    const failure = teamApiError(
      error,
      "Notification channels are temporarily unavailable.",
    );
    return NextResponse.json(
      { error: failure.error, ...(failure.code ? { code: failure.code } : {}) },
      { status: failure.status },
    );
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    await requireEntitlement(id, "notification_channels", 1);
    if (!outboundNotificationsConfigured())
      return NextResponse.json(
        {
          error:
            "Outbound notifications are not configured by the service operator.",
        },
        { status: 503 },
      );
    const body = await request.json();
    const url = String(body.webhook_url || "").trim();
    const kind = String(body.kind || "slack_webhook");
    const label = String(body.label || "Security alerts")
      .trim()
      .slice(0, 80);
    const severity = String(body.minimum_severity || "MEDIUM").toUpperCase();
    const jira = {
      site: String(body.jira_site || "")
        .trim()
        .replace(/\/$/, ""),
      email: String(body.jira_email || "").trim(),
      api_token: String(body.jira_api_token || "").trim(),
      project_key: String(body.jira_project_key || "")
        .trim()
        .toUpperCase(),
    };
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (kind === "email_resend" && !emailDeliveryConfigured())
      return NextResponse.json(
        { error: "Email delivery is not configured by the service operator." },
        { status: 503 },
      );
    const validTarget = validateTarget(kind, url, jira, email);
    if (!label || !severities.has(severity) || !validTarget)
      return NextResponse.json(
        {
          error:
            "Provide a valid notification type, target, channel name, and severity.",
        },
        { status: 400 },
      );

    const response = await validateProvider(kind, url, jira);
    if (!response.ok)
      return NextResponse.json(
        { error: "The notification endpoint rejected validation." },
        { status: 400 },
      );
    const target =
      kind === "jira_cloud"
        ? JSON.stringify(jira)
        : kind === "email_resend"
          ? email
          : url;
    const { data, error } = await serviceDb()
      .from("team_notification_channels")
      .insert({
        team_id: id,
        kind,
        label,
        target_encrypted: encryptTarget(target),
        minimum_severity: severity,
        last_validated_at: new Date().toISOString(),
      })
      .select(
        "id,kind,label,enabled,minimum_severity,last_validated_at,last_error,created_at",
      )
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const failure = teamApiError(
      error,
      "The notification channel could not be connected.",
    );
    return NextResponse.json(
      { error: failure.error, ...(failure.code ? { code: failure.code } : {}) },
      { status: failure.status },
    );
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { user } = await authenticated(request);
    const { id } = await context.params;
    await requireTeamRole(id, user.id, ["owner", "admin"]);
    const channelId = new URL(request.url).searchParams.get("channel_id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(channelId))
      return NextResponse.json(
        { error: "A valid channel id is required." },
        { status: 400 },
      );
    const { data, error } = await serviceDb()
      .from("team_notification_channels")
      .delete()
      .eq("id", channelId)
      .eq("team_id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Notification channel not found." },
        { status: 404 },
      );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const failure = teamApiError(
      error,
      "The notification channel could not be removed.",
    );
    return NextResponse.json(
      { error: failure.error, ...(failure.code ? { code: failure.code } : {}) },
      { status: failure.status },
    );
  }
}

function validateTarget(
  kind: string,
  url: string,
  jira: { site: string; email: string; api_token: string; project_key: string },
  email: string,
) {
  if (kind === "slack_webhook") return isSlackWebhook(url);
  if (kind === "generic_webhook") return isSafeWebhookUrl(url);
  if (kind === "email_resend") return isNotificationEmail(email);
  if (kind === "jira_cloud") {
    try {
      parseJiraTarget(JSON.stringify(jira));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function validateProvider(
  kind: string,
  url: string,
  jira: { site: string; email: string; api_token: string },
) {
  if (kind === "email_resend")
    return Promise.resolve(new Response(null, { status: 204 }));
  if (kind === "jira_cloud")
    return fetch(`${jira.site}/rest/api/3/myself`, {
      redirect: "error",
      headers: {
        Authorization: jiraAuthorization(
          jira as Parameters<typeof jiraAuthorization>[0],
        ),
        Accept: "application/json",
        "User-Agent": "GuardRails-Notification-Validator/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });
  return fetch(url, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "GuardRails-Notification-Validator/1.0",
    },
    body: JSON.stringify(
      kind === "slack_webhook"
        ? { text: "GuardRails team notifications connected." }
        : {
            event: "guardrails.channel_verified",
            message: "GuardRails team notifications connected.",
          },
    ),
    signal: AbortSignal.timeout(10_000),
  });
}

function isSlackWebhook(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "hooks.slack.com" &&
      /^\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
