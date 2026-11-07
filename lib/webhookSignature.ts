export async function signedWebhookHeaders(secret: string, event: string, body: string, timestamp = Math.floor(Date.now() / 1000).toString()) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`)));
  const signature = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { "X-GuardRails-Event": event, "X-GuardRails-Timestamp": timestamp, "X-GuardRails-Signature": `v1=${signature}` };
}
