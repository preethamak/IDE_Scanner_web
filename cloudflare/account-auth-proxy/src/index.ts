import { rewriteAccountDocument } from "./response";

type OriginWorker = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
};

type Env = {
  ORIGIN: OriginWorker;
};

const isAccountPage = (url: URL) =>
  url.pathname === "/account" || url.pathname.startsWith("/account/");

function requestForOrigin(request: Request): Request {
  const url = new URL(request.url);
  url.protocol = "https:";
  url.hostname = "abscissa.dev";
  const headers = new Headers(request.headers);
  headers.set("host", "abscissa.dev");
  headers.set("x-forwarded-host", "abscissa.dev");
  return new Request(url, { body: request.body, headers, method: request.method });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ORIGIN.fetch(requestForOrigin(request));

    if (request.method !== "GET" || !isAccountPage(new URL(request.url))) {
      return response;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return response;
    }

    const html = await response.text();
    const rewritten = rewriteAccountDocument(html);
    if (rewritten === html) return new Response(html, response);

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(rewritten, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
};

export default worker;
