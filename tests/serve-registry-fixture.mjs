import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";

// Serve the unchanged attested snapshot outside Next's SSR event loop. A
// self-fetch through the app server can time out while it compiles a route.
const snapshot = fileURLToPath(new URL("../public/registry-snapshot.json", import.meta.url));
createServer((request, response) => {
  if (request.url === "/health") { response.writeHead(200); response.end("ready"); return; }
  if (request.method !== "GET" || request.url !== "/registry-snapshot.json") { response.writeHead(404); response.end(); return; }
  const stream = createReadStream(snapshot);
  stream.once("error", () => { if (!response.headersSent) response.writeHead(500); response.end(); });
  response.setHeader("Content-Type", "application/json");
  stream.pipe(response);
}).listen(8766, "127.0.0.1");
