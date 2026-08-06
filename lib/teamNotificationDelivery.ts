import { emailDeliveryConfigured, emailPayload } from "@/lib/emailNotification";
import {
  jiraAuthorization,
  jiraIssuePayload,
  parseJiraTarget,
} from "@/lib/jiraNotification";
import { decryptTarget } from "@/lib/notificationCrypto";
import {
  genericWebhookMessage,
  isSafeWebhookUrl,
} from "@/lib/teamNotificationPayload";

export type DeliverableTeamChannel = {
  kind: string;
  target_encrypted: string;
};

export async function deliverTeamChannelTest(channel: DeliverableTeamChannel) {
  const target = decryptTarget(channel.target_encrypted);
  const alert = testAlert();
  let destination = target;
  let payload: unknown;
  let authorization: string | null = null;

  if (channel.kind === "slack_webhook") {
    payload = slackTestMessage();
  } else if (channel.kind === "generic_webhook") {
    if (!isSafeWebhookUrl(target))
      throw new Error("The stored webhook target is no longer allowed.");
    payload = {
      ...genericWebhookMessage(alert),
      event: "guardrails.integration_test",
      test: true,
    };
  } else if (channel.kind === "jira_cloud") {
    const jira = parseJiraTarget(target);
    destination = `${jira.site}/rest/api/3/issue`;
    payload = jiraIssuePayload(alert, jira.project_key);
    authorization = jiraAuthorization(jira);
  } else if (channel.kind === "email_resend") {
    if (!emailDeliveryConfigured())
      throw new Error(
        "Email delivery is not configured by the service operator.",
      );
    destination = "https://api.resend.com/emails";
    payload = emailPayload(alert, target);
    authorization = `Bearer ${process.env.RESEND_API_KEY}`;
  } else {
    throw new Error("This notification provider is not supported.");
  }

  const response = await fetch(destination, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "GuardRails-Notification-Test/1.0",
      ...(channel.kind === "generic_webhook"
        ? { "X-GuardRails-Event": "integration_test" }
        : {}),
      ...(authorization
        ? { Authorization: authorization, Accept: "application/json" }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error(
      `${providerName(channel.kind)} returned HTTP ${response.status}.`,
    );
  return {
    provider: providerName(channel.kind),
    delivered_at: new Date().toISOString(),
  };
}

export function providerName(kind: string) {
  return kind === "slack_webhook"
    ? "Slack"
    : kind === "generic_webhook"
      ? "Webhook"
      : kind === "jira_cloud"
        ? "Jira Cloud"
        : kind === "email_resend"
          ? "Email"
          : "Provider";
}

function testAlert() {
  return {
    id: "integration-test",
    kind: "integration_test",
    severity: "INFORMATIONAL",
    title: "GuardRails delivery test",
    summary:
      "Your workspace notification channel is connected and ready for meaningful extension release changes.",
    extension_id: "guardrails.integration-test",
    version: "1.0.0",
    created_at: new Date().toISOString(),
    metadata: { integration_test: true },
  };
}

function slackTestMessage() {
  return {
    text: "GuardRails delivery test succeeded.",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "GuardRails · Channel connected",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Your workspace can deliver meaningful extension release changes here.",
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "This is a test only. No security decision was created.",
          },
        ],
      },
    ],
  };
}
