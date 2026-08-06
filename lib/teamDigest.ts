import { decryptTarget } from "@/lib/notificationCrypto";
import { emailDeliveryConfigured } from "@/lib/emailNotification";
import { retryDisposition } from "@/lib/monitoringPolicy";
import { serviceDb } from "@/lib/supabase";

type Db = ReturnType<typeof serviceDb>;
type Row = Record<string, unknown>;
type DigestChannel = { kind: string; target_encrypted: string; label?: string };

export type TeamDigestSnapshot = {
  team: string;
  period_start: string;
  period_end: string;
  monitored_extensions: number;
  release_changes: number;
  high_priority_changes: number;
  decisions_recorded: number;
  needs_review: number;
  highlights: Array<{
    title: string;
    extension_id: string;
    version: string;
    severity: string;
  }>;
};

export async function deliverWeeklyTeamDigests(db: Db, now: string) {
  const queued = await db.rpc("queue_team_weekly_digests", { target_now: now });
  if (queued.error)
    return {
      error: queued.error.message,
      queued: 0,
      considered: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  const response = await db
    .from("team_digest_deliveries")
    .select(
      "id,team_id,channel_id,period_start,period_end,attempts,team_notification_channels!inner(kind,label,target_encrypted,enabled),teams!inner(name)",
    )
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", now)
    .order("created_at")
    .limit(25);
  if (response.error)
    return {
      error: response.error.message,
      queued: Number(queued.data || 0),
      considered: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const enabledByTeam = new Map<string, boolean>();
  for (const delivery of response.data || []) {
    const row = delivery as Row;
    const channel = one(row.team_notification_channels) as DigestChannel & Row;
    const attempts = Number(row.attempts || 0);
    const teamId = String(row.team_id || "");
    let digestEnabled = enabledByTeam.get(teamId);
    if (digestEnabled === undefined) {
      const preference = await db
        .from("team_monitoring_preferences")
        .select("weekly_digest")
        .eq("team_id", teamId)
        .maybeSingle();
      if (preference.error)
        return {
          error: preference.error.message,
          queued: Number(queued.data || 0),
          considered: 0,
          sent,
          failed,
          skipped,
        };
      digestEnabled = preference.data?.weekly_digest === true;
      enabledByTeam.set(teamId, digestEnabled);
    }
    if (!digestEnabled) {
      await finishDigest(
        db,
        row.id,
        "skipped",
        "Weekly digest was disabled before delivery.",
        attempts,
        null,
      );
      skipped += 1;
      continue;
    }
    if (
      channel.enabled === false ||
      !["slack_webhook", "email_resend"].includes(String(channel.kind))
    ) {
      await finishDigest(
        db,
        row.id,
        "skipped",
        "Channel is unavailable for weekly digests.",
        attempts,
        null,
      );
      skipped += 1;
      continue;
    }
    await db
      .from("team_digest_deliveries")
      .update({ status: "sending", attempts: attempts + 1, updated_at: now })
      .eq("id", row.id)
      .in("status", ["pending", "failed"]);
    try {
      const snapshot = await buildSnapshot(
        db,
        teamId,
        String(one(row.teams).name || "Your workspace"),
        String(row.period_start),
        String(row.period_end),
      );
      await sendDigest(channel, snapshot);
      await finishDigest(db, row.id, "sent", null, attempts + 1, snapshot);
      sent += 1;
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Weekly digest delivery failed.";
      const status =
        retryDisposition(attempts + 1) === "skip" ? "skipped" : "failed";
      await finishDigest(db, row.id, status, message, attempts + 1, null);
      if (status === "skipped") skipped += 1;
      else failed += 1;
    }
  }
  return {
    error: "",
    queued: Number(queued.data || 0),
    considered: (response.data || []).length,
    sent,
    failed,
    skipped,
  };
}

export function slackDigestPayload(snapshot: TeamDigestSnapshot) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app";
  const facts = `*${snapshot.release_changes}* release changes · *${snapshot.needs_review}* need review · *${snapshot.decisions_recorded}* decisions`;
  const highlights = snapshot.highlights.length
    ? snapshot.highlights
        .map(
          (item) =>
            `• *${escapeSlack(item.extension_id)}@${escapeSlack(item.version)}* — ${escapeSlack(item.title)}`,
        )
        .join("\n")
    : "No meaningful release changes this week.";
  return {
    text: `GuardRails weekly security digest for ${snapshot.team}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "GuardRails · Weekly security digest",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${escapeSlack(snapshot.team)}*\n${facts}`,
        },
      },
      { type: "section", text: { type: "mrkdwn", text: highlights } },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Open review inbox" },
            url: `${site}/workspace`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${snapshot.monitored_extensions} monitored extensions · ${periodLabel(snapshot)}`,
          },
        ],
      },
    ],
  };
}

export function emailDigestPayload(
  snapshot: TeamDigestSnapshot,
  recipient: string,
) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "https://ide-scanner.vercel.app";
  const highlights = snapshot.highlights.length
    ? snapshot.highlights
        .map((item) => `- ${item.extension_id}@${item.version}: ${item.title}`)
        .join("\n")
    : "- No meaningful release changes this week.";
  return {
    from: process.env.NOTIFICATION_FROM_EMAIL,
    to: [recipient],
    subject: `[GuardRails] ${snapshot.needs_review ? `${snapshot.needs_review} ${snapshot.needs_review === 1 ? "release needs" : "releases need"} review` : "Your weekly security digest"}`,
    text: `GuardRails weekly security digest\n${snapshot.team} · ${periodLabel(snapshot)}\n\n${snapshot.release_changes} release changes\n${snapshot.high_priority_changes} high-priority changes\n${snapshot.decisions_recorded} decisions recorded\n${snapshot.needs_review} ${snapshot.needs_review === 1 ? "release needs" : "releases need"} review\n${snapshot.monitored_extensions} monitored extensions\n\nHighlights\n${highlights}\n\nOpen review inbox: ${site}/workspace`,
  };
}

async function buildSnapshot(
  db: Db,
  teamId: string,
  team: string,
  periodStart: string,
  periodEnd: string,
): Promise<TeamDigestSnapshot> {
  const [alerts, decisions, watches] = await Promise.all([
    db
      .from("team_monitoring_alerts")
      .select("title,extension_id,version,severity,kind,created_at")
      .eq("team_id", teamId)
      .gte("created_at", periodStart)
      .lt("created_at", periodEnd)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("team_decisions")
      .select("decision,updated_at")
      .eq("team_id", teamId)
      .limit(500),
    db
      .from("team_watchlist_items")
      .select("extension_id", { count: "exact", head: true })
      .eq("team_id", teamId),
  ]);
  if (alerts.error || decisions.error || watches.error)
    throw new Error("Digest activity could not be summarized.");
  const alertRows = (alerts.data || []) as Row[];
  const decisionRows = (decisions.data || []) as Row[];
  return {
    team,
    period_start: periodStart,
    period_end: periodEnd,
    monitored_extensions: Number(watches.count || 0),
    release_changes: alertRows.filter((row) =>
      String(row.kind).includes("release"),
    ).length,
    high_priority_changes: alertRows.filter((row) =>
      ["CRITICAL", "HIGH"].includes(String(row.severity)),
    ).length,
    decisions_recorded: decisionRows.filter((row) => {
      const updated = new Date(String(row.updated_at || "")).getTime();
      return (
        String(row.decision) !== "review" &&
        updated >= new Date(periodStart).getTime() &&
        updated < new Date(periodEnd).getTime()
      );
    }).length,
    needs_review: decisionRows.filter(
      (row) => String(row.decision) === "review",
    ).length,
    highlights: alertRows.slice(0, 5).map((row) => ({
      title: String(row.title || "Extension release changed"),
      extension_id: String(row.extension_id || "extension"),
      version: String(row.version || ""),
      severity: String(row.severity || "INFORMATIONAL"),
    })),
  };
}

async function sendDigest(
  channel: DigestChannel,
  snapshot: TeamDigestSnapshot,
) {
  const target = decryptTarget(channel.target_encrypted);
  const email = channel.kind === "email_resend";
  if (email && !emailDeliveryConfigured())
    throw new Error(
      "Email delivery is not configured by the service operator.",
    );
  const response = await fetch(
    email ? "https://api.resend.com/emails" : target,
    {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "GuardRails-Weekly-Digest/1.0",
        ...(email
          ? {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              Accept: "application/json",
            }
          : {}),
      },
      body: JSON.stringify(
        email
          ? emailDigestPayload(snapshot, target)
          : slackDigestPayload(snapshot),
      ),
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!response.ok)
    throw new Error(
      `${email ? "Email" : "Slack"} returned HTTP ${response.status}.`,
    );
}

async function finishDigest(
  db: Db,
  id: unknown,
  status: "sent" | "failed" | "skipped",
  lastError: string | null,
  attempts: number,
  snapshot: TeamDigestSnapshot | null,
) {
  const retryMinutes = Math.min(360, 5 * 2 ** Math.min(attempts, 6));
  await db
    .from("team_digest_deliveries")
    .update({
      status,
      last_error: lastError,
      snapshot: snapshot || {},
      delivered_at: status === "sent" ? new Date().toISOString() : null,
      next_attempt_at:
        status === "failed"
          ? new Date(Date.now() + retryMinutes * 60_000).toISOString()
          : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

function one(value: unknown): Row {
  return (Array.isArray(value) ? value[0] : value || {}) as Row;
}
function periodLabel(snapshot: TeamDigestSnapshot) {
  return `${new Date(snapshot.period_start).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}–${new Date(snapshot.period_end).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}
function escapeSlack(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
