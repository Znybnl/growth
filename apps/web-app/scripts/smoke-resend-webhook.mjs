import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

// Run after next build. Only loopback services, synthetic keys and data.
const calls = [];
let storageFailed = false;
const storage = createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  calls.push({ method: request.method, url: request.url, body: raw ? JSON.parse(raw) : null });
  response.setHeader("content-type", "application/json");
  if (storageFailed) {
    response.writeHead(400).end(JSON.stringify({ code: "TEST", message: "private_storage_error" }));
  } else if (request.method === "PATCH" && request.url.startsWith("/rest/v1/reward_email_deliveries?")) {
    response.end(JSON.stringify({ id: "00000000-0000-4000-8000-000000000573" }));
  } else if (request.method === "POST" && request.url === "/rest/v1/reward_email_events") {
    response.writeHead(201).end();
  } else {
    response.writeHead(404).end(JSON.stringify({ message: "Unexpected fixture request" }));
  }
});
await new Promise((resolve) => storage.listen(0, "127.0.0.1", resolve));
const storageOrigin = `http://127.0.0.1:${storage.address().port}`;
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const secret = `whsec_${randomBytes(32).toString("base64")}`;
const nextBin = import.meta.resolve("next/dist/bin/next");
const { fileURLToPath } = await import("node:url");
const appRoot = fileURLToPath(new URL("../", import.meta.url));
const child = spawn(process.execPath, [fileURLToPath(nextBin), "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: appRoot, stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    RESEND_WEBHOOK_SECRET: secret, RESEND_API_KEY: "re_synthetic_test_not_real",
    NEXT_PUBLIC_SUPABASE_URL: storageOrigin, SUPABASE_SERVICE_ROLE_KEY: "synthetic_local_service_role",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "synthetic_local_anon", ALLOW_MEMORY_STORE_FALLBACK: "false",
    ALLOW_INSECURE_LOCAL_TLS: "false",
  },
});
// Never forward environment or potentially sensitive diagnostics from a child.
child.stdout.resume(); child.stderr.resume();
const origin = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error("Compiled server exited before readiness");
    try {
      const response = await fetch(`${origin}/api/webhooks/resend`);
      if (response.status === 405) { ready = true; break; }
    } catch { /* Local process still starting. */ }
    await delay(100);
  }
  assert.equal(ready, true, "compiled webhook route ready");
  const body = JSON.stringify({
    type: "email.delivered", created_at: "2026-10-18T08:00:00.000Z",
    data: { email_id: "00000000-0000-4000-8000-000000000573" },
  }, null, 2);
  const id = "msg_synthetic_http_573";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${id}.${timestamp}.${body}`).digest("base64");
  const headers = { "content-type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": `v1,${signature}` };
  const post = (options = {}) => fetch(`${origin}/api/webhooks/resend`, { method: "POST", headers, body, ...options });

  assert.equal((await post({ headers: { "content-type": "application/json" } })).status, 400);
  assert.equal((await post({ body: body + " " })).status, 400);
  assert.equal(calls.length, 0, "invalid events never reach storage");
  const valid = await post();
  assert.equal(valid.status, 200, "real SDK and DAL accept signed Svix event");
  assert.deepEqual(await valid.json(), { received: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].method, "PATCH");
  assert.match(calls[0].url, /resend_email_id=eq\.00000000-0000-4000-8000-000000000573/);
  assert.equal(calls[0].body.status, "delivered");
  assert.equal(calls[1].body.event_type, "email.delivered");
  assert.equal(calls[1].body.reward_email_delivery_id, "00000000-0000-4000-8000-000000000573");
  assert.deepEqual(calls[1].body.payload, JSON.parse(body));
  storageFailed = true;
  const failed = await post();
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private_storage_error/);
  storageFailed = false;
  assert.equal((await post()).status, 200, "retry succeeds after storage recovery");
  console.log("PASS: compiled HTTP route → real SDK → real DAL → local storage fixture; 400/200/503/retry verified. No real email or database used.");
} finally {
  child.kill();
  await new Promise((resolve) => {
    if (child.exitCode !== null) resolve();
    else child.once("exit", resolve);
  });
  await new Promise((resolve) => storage.close(resolve));
}
