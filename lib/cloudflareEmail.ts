import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { runtimeEnv } from "@/lib/runtimeEnv";

type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailBinding = {
  send(message: EmailMessage): Promise<unknown>;
};

export function cloudflareEmail(): EmailBinding | null {
  try {
    const env = getCloudflareContext().env as unknown as Record<string, unknown>;
    const binding = env.AUTH_EMAIL as EmailBinding | undefined;
    return binding && typeof binding.send === "function" ? binding : null;
  } catch {
    return null;
  }
}

export function authEmailFrom(): string {
  return runtimeEnv("AUTH_EMAIL_FROM").trim() || "hello@abscissa.dev";
}

export async function sendAuthLink(email: string, link: string): Promise<void> {
  const message: EmailMessage = {
    to: email,
    from: authEmailFrom(),
    subject: "Sign in to GuardRails",
    text: `Use this secure link to sign in to GuardRails:\n\n${link}\n\nThis link expires in 10 minutes. If you did not request it, you can ignore this email.`,
    html: `<p>Use this secure link to sign in to GuardRails:</p><p><a href="${link}">Sign in to GuardRails</a></p><p>This link expires in 10 minutes. If you did not request it, you can ignore this email.</p>`,
  };

  const binding = cloudflareEmail();
  if (binding) {
    try {
      await binding.send(message);
      return;
    } catch {
      // Fall through to the configured transactional provider.
    }
  }

  const apiKey = runtimeEnv("RESEND_API_KEY").trim();
  if (!apiKey) throw new Error("No transactional email provider is configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...message, to: [message.to] }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Transactional email provider returned HTTP ${response.status}.`);
}

export async function sendWorkspaceInvitation(email: string, link: string, role: string): Promise<void> {
  const message: EmailMessage = {
    to: email,
    from: authEmailFrom(),
    subject: "You are invited to a GuardRails workspace",
    text: `You have been invited as a ${role} to a GuardRails workspace.\n\nAccept invitation: ${link}\n\nThis invitation expires in seven days.`,
    html: `<p>You have been invited as a <strong>${role}</strong> to a GuardRails workspace.</p><p><a href="${link}">Accept invitation</a></p><p>This invitation expires in seven days.</p>`,
  };
  const binding = cloudflareEmail();
  if (binding) { await binding.send(message); return; }
  const apiKey = runtimeEnv("RESEND_API_KEY").trim();
  if (!apiKey) throw new Error("No transactional email provider is configured.");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...message, to: [message.to] }), signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Transactional email provider returned HTTP ${response.status}.`);
}
