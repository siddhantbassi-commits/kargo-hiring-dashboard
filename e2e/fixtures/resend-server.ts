import { createServer } from "node:http";
import { RESEND_FIXTURE_PORT } from "../ports";

/**
 * A fake Resend API for E2E tests — never sends real email. The Resend SDK
 * reads RESEND_BASE_URL itself (see node_modules/resend/dist/index.mjs's
 * getDefaultBaseUrl — it checks that env var before falling back to
 * api.resend.com), so no change to the app's own code was needed to point
 * it here.
 *
 * Implements only POST /emails, matching Resend's real response shape
 * ({"id": "..."}) closely enough for the SDK's own response wrapper to
 * treat it as a successful send. Captures sent emails in memory so tests
 * can assert on them via GET /__sent.
 */

interface SentEmail {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
}

const sent: SentEmail[] = [];
let nextId = 1;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/__sent") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(sent));
    return;
  }

  if (req.method === "POST" && url.pathname === "/emails") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body || "{}") as SentEmail;
        sent.push(parsed);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: `fixture-email-${nextId++}` }));
      } catch (error) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found in Resend fixture server." }));
});

server.listen(RESEND_FIXTURE_PORT, () => {
  console.log(`[resend-fixture] listening on http://127.0.0.1:${RESEND_FIXTURE_PORT}`);
});
