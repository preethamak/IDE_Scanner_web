import { NextResponse } from "next/server";
import { decryptTarget } from "@/lib/notificationCrypto";
import {
  alertEvent,
  retryDisposition,
  shouldNotify,
} from "@/lib/monitoringPolicy";
import { serviceDb } from "@/lib/supabase";
import { genericWebhookMessage } from "@/lib/teamNotificationPayload";
import {
  jiraAuthorization,
  jiraIssuePayload,
  parseJiraTarget,
} from "@/lib/jiraNotification";
import { emailDeliveryConfigured, emailPayload } from "@/lib/emailNotification";
import { queueDecisionDueAlerts } from "@/lib/decisionDueAlerts";
import { teamReleaseNotification } from "@/lib/teamReleaseNotificationPayload";
import { deliverWeeklyTeamDigests } from "@/lib/teamDigest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const expected = process.env.NOTIFICATION_CRON_SECRET || "";
  if (
    !expected ||
    request.headers.get("authorization") !== `Bearer ${expected}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workflowRun = request.headers.get("x-workflow-run-url");
  if (workflowRun)
    console.info("Notification delivery workflow", {
      workflow_run_url: workflowRun,
    });
  const db = serviceDb();
  const now = new Date().toISOString();
  const dueAlerts = await queueDecisionDueAlerts(db, now);
  if (dueAlerts.error)
    return NextResponse.json({ error: dueAlerts.error }, { status: 500 });
  const { data, error } = await db
    .from("notification_deliveries")
    .select(
      "id,attempts,notification_channels!inner(id,kind,label,target_encrypted,enabled),monitoring_alerts!inner(id,extension_id,version,kind,severity,state,title,summary,created_at)",
    )
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", now)
    .order("created_at")
    .limit(50);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of data || []) {
    const channel = one(row.notification_channels);
    const alert = one(row.monitoring_alerts);
    if (!channel?.enabled || alert?.state === "dismissed") {
      await finish(db, row.id, "skipped", null, Number(row.attempts || 0));
      skipped += 1;
      continue;
    }
    await db
      .from("notification_deliveries")
      .update({
        status: "sending",
        attempts: Number(row.attempts || 0) + 1,
        updated_at: now,
      })
      .eq("id", row.id)
      .in("status", ["pending", "failed"]);
    try {
      const target = decryptTarget(String(channel.target_encrypted));
      const response = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackMessage(alert)),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`Slack returned ${response.status}`);
      await finish(db, row.id, "sent", null, Number(row.attempts || 0) + 1);
      sent += 1;
    } catch (deliveryError) {
      await finish(
        db,
        row.id,
        "failed",
        deliveryError instanceof Error
          ? deliveryError.message
          : "Delivery failed",
        Number(row.attempts || 0) + 1,
      );
      failed += 1;
    }
  }
  const team = await deliverTeamNotifications(db, now);
  if (team.error)
    return NextResponse.json({ error: team.error }, { status: 500 });
  const digests = await deliverWeeklyTeamDigests(db, now);
  if (digests.error)
    return NextResponse.json({ error: digests.error }, { status: 500 });
  return NextResponse.json({
    queued_decision_due: dueAlerts.queued,
    considered: (data || []).length + team.considered,
    sent: sent + team.sent,
    failed: failed + team.failed,
    skipped: skipped + team.skipped,
    weekly_digest: digests,
  });
}

type Db = ReturnType<typeof serviceDb>;
type Row = Record<string, unknown>;
function one(value: unknown): Row {
  return (Array.isArray(value) ? value[0] : value || {}) as Row;
}

async function finish(
  db: Db,
  id: unknown,
  status: "sent" | "failed" | "skipped",
  lastError: string | null,
  attempts: number,
) {
  const retryMinutes = Math.min(360, 5 * 2 ** Math.min(attempts, 6));
  await db
    .from("notification_deliveries")
    .update({
      status,
      last_error: lastError,
      delivered_at: status === "sent" ? new Date().toISOString() : null,
      next_attempt_at:
        status === "failed"
          ? new Date(Date.now() + retryMinutes * 60_000).toISOString()
          : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}
async function deliverTeamNotifications(db: Db, now: string) {
  const { data, error } = await db
    .from("team_notification_deliveries")
    .select(
      "id,attempts,team_notification_channels!inner(id,kind,label,target_encrypted,enabled,minimum_severity),team_monitoring_alerts!inner(id,team_id,extension_id,version,kind,severity,state,title,summary,metadata,created_at)",
    )
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", now)
    .order("created_at")
    .limit(50);
  if (error)
    return {
      error: error.message,
      considered: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const preferencesByTeam = new Map<string, Row>();
  for (const row of data || []) {
    const channel = one(row.team_notification_channels);
    const alert = one(row.team_monitoring_alerts);
    const attempts = Number(row.attempts || 0);
    const metadata = one(alert?.metadata);
    const teamId = String(alert?.team_id || "");
    let preferences = preferencesByTeam.get(teamId);
    if (!preferences && teamId) {
      const response = await db
        .from("team_monitoring_preferences")
        .select("*")
        .eq("team_id", teamId)
        .maybeSingle();
      preferences = one(response.data);
      preferencesByTeam.set(teamId, preferences);
    }
    const eligible = shouldNotify({
      decision: String(metadata.decision || "incomplete"),
      publicOutcome:
        typeof metadata.public_outcome === "string"
          ? metadata.public_outcome
          : null,
      severity: typeof alert?.severity === "string" ? alert.severity : null,
      coveragePercent: Number(metadata.coverage_percent || 0),
      event: alertEvent(alert?.kind),
      minimumSeverity: String(channel?.minimum_severity || "MEDIUM"),
      releaseAlerts: preferences?.release_alerts !== false,
      scanAlerts: preferences?.scan_alerts !== false,
      decisionAlerts: preferences?.decision_alerts !== false,
      highEvidenceAlerts: preferences?.high_evidence_alerts !== false,
      provenanceAlerts: preferences?.provenance_alerts !== false,
      coverageAlerts: preferences?.coverage_alerts !== false,
      dueAlerts: preferences?.due_alerts !== false,
    });
    if (!channel?.enabled || alert?.state === "dismissed" || !eligible) {
      await finishTeam(db, row.id, "skipped", null, attempts);
      skipped += 1;
      continue;
    }
    await db
      .from("team_notification_deliveries")
      .update({ status: "sending", attempts: attempts + 1, updated_at: now })
      .eq("id", row.id)
      .in("status", ["pending", "failed"]);
    try {
      const kind = String(channel.kind || "slack_webhook");
      const target = decryptTarget(String(channel.target_encrypted));
      const releaseEvent = metadata.release_event === true;
      let destination = target;
      let payload: unknown =
        kind === "generic_webhook"
          ? genericWebhookMessage(alert)
          : releaseEvent
            ? teamReleaseNotification(alert)
            : slackMessage(alert);
      let authorization: string | null = null;
      if (kind === "jira_cloud") {
        const jira = parseJiraTarget(target);
        destination = `${jira.site}/rest/api/3/issue`;
        payload = jiraIssuePayload(alert, jira.project_key);
        authorization = jiraAuthorization(jira);
      }
      if (kind === "email_resend") {
        if (!emailDeliveryConfigured())
          throw new Error(
            "Email delivery is not configured by the service operator.",
          );
        destination = "https://api.resend.com/emails";
        payload = emailPayload(alert, target);
        authorization = `Bearer ${process.env.RESEND_API_KEY}`;
      }
      const response = await fetch(destination, {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "GuardRails-Notification-Delivery/1.0",
          ...(kind === "generic_webhook"
            ? { "X-GuardRails-Event": "monitoring_alert" }
            : {}),
          ...(authorization
            ? { Authorization: authorization, Accept: "application/json" }
            : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`Slack returned ${response.status}`);
      await finishTeam(db, row.id, "sent", null, attempts + 1);
      sent += 1;
    } catch (deliveryError) {
      const message =
        deliveryError instanceof Error
          ? deliveryError.message
          : "Delivery failed";
      if (retryDisposition(attempts + 1) === "skip") {
        await finishTeam(db, row.id, "skipped", message, attempts + 1);
        skipped += 1;
      } else {
        await finishTeam(db, row.id, "failed", message, attempts + 1);
        failed += 1;
      }
    }
  }
  return { error: "", considered: (data || []).length, sent, failed, skipped };
}
async function finishTeam(
  db: Db,
  id: unknown,
  status: "sent" | "failed" | "skipped",
  lastError: string | null,
  attempts: number,
) {
  const retryMinutes = Math.min(360, 5 * 2 ** Math.min(attempts, 6));
  await db
    .from("team_notification_deliveries")
    .update({
      status,
      last_error: lastError,
      delivered_at: status === "sent" ? new Date().toISOString() : null,
      next_attempt_at:
        status === "failed"
          ? new Date(Date.now() + retryMinutes * 60_000).toISOString()
          : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}
function slackMessage(alert: Row) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app";
  const extension = String(alert.extension_id);
  const version = String(alert.version);
  const severity = String(alert.severity || "INFORMATIONAL");
  const url = `${site}/extensions/${encodeURIComponent(extension)}/versions/${encodeURIComponent(version)}`;
  return {
    text: `${severity}: ${String(alert.title)}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `IDE Scanner · ${severity}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${escapeSlack(String(alert.title))}*\n${escapeSlack(String(alert.summary))}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${escapeSlack(extension)}@${escapeSlack(version)} · exact artifact evidence`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open evidence" },
            url,
          },
        ],
      },
    ],
  };
}
function escapeSlack(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
