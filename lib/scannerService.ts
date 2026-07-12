const serviceUrl = process.env.IDE_SCANNER_API_URL?.replace(/\/$/, "") || "";
const serviceToken = process.env.IDE_SCANNER_API_TOKEN || "";

export function hasScannerService(): boolean { return Boolean(serviceUrl); }

export async function scannerServiceRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!serviceUrl) throw new Error("Python scanner service is not configured.");
  const response = await fetch(`${serviceUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(serviceToken ? { Authorization: `Bearer ${serviceToken}` } : {}), ...init?.headers },
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Scanner service returned ${response.status}.`);
  return body as T;
}
