import { createServer } from "node:http";
import { spawn, execSync } from "node:child_process";
import { APP_PORT, READINESS_PORT } from "./ports";

/**
 * Migrates + seeds the DB, builds the app, then serves that production
 * build (`next start`) — NOT `next dev`.
 *
 * This replaced a `next dev` + per-route warm-up version after the actual
 * root cause of 3 CI-only E2E failures (delete confirm never appearing,
 * rubric weight edits never registering) turned out to be dev-mode itself:
 * the trace showed repeated failed HMR WebSocket reconnect attempts
 * throughout the run (`net::ERR_INVALID_HTTP_RESPONSE`) — Next's dev
 * client/Fast Refresh runtime does not tolerate that gracefully in this
 * sandboxed network environment, and local React state in client
 * components (confirm-step toggles, uncommitted form edits) got silently
 * reset. A production build has no HMR/Fast Refresh and no lazy
 * per-route compilation at all, which removes both failure modes at once
 * rather than papering over either individually.
 *
 * Health-checked on READINESS_PORT (not APP_PORT) so Playwright's
 * webServer check can't pass early just because `next start`'s own port
 * already accepts connections before the app has actually finished
 * booting the production server.
 */
const BASE_URL = `http://127.0.0.1:${APP_PORT}`;

function run(command: string) {
  console.log(`[start-app] $ ${command}`);
  execSync(command, { stdio: "inherit" });
}

async function waitForServerUp() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(BASE_URL);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Server on ${BASE_URL} never came up.`);
}

run("npx prisma migrate deploy");
run("npx tsx prisma/seed.ts");
run("npm run build"); // prisma generate && next build

console.log("[start-app] starting next start...");
const next = spawn("npx", ["next", "start", "-p", String(APP_PORT)], { stdio: "inherit" });
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => next.kill(signal));
}

await waitForServerUp();
console.log("[start-app] app is up — opening the readiness port for Playwright.");

// Only NOW does Playwright's webServer health check (pointed at this port,
// not APP_PORT) have anything to succeed against.
createServer((_req, res) => res.writeHead(200).end("ready")).listen(READINESS_PORT);
