import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { registerHooks } from "node:module";
import { after, beforeEach, test } from "node:test";

// Keep the real Resend signature verifier; isolate only storage and logging.
const nextServerUrl = import.meta.resolve("next/server.js");
registerHooks({
  resolve(name, context, next) {
    const mocks = {
      "next/server": `export {NextResponse} from ${JSON.stringify(nextServerUrl)};`,
      "@/lib/campaign-repository": "export const syncRewardEmailWebhookInSupabase=async event=>{globalThis.__webhookTest.calls.push(event);if(globalThis.__webhookTest.storageError)throw Error(globalThis.__webhookTest.storageError);};",
      "@/lib/support-log": "export const logSupportEvent=(...args)=>globalThis.__webhookTest.logs.push(args);",
      "@/lib/supabase": "export const allowLocalTlsBypass=()=>{};",
    };
    if (name in mocks) return { url: `data:text/javascript,${encodeURIComponent(mocks[name])}`, shortCircuit: true };
    return next(name, context);
  },
});
const { POST } = await import("../app/api/webhooks/resend/route.ts");
const savedEnv = { RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET, RESEND_API_KEY: process.env.RESEND_API_KEY };
after(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  delete globalThis.__webhookTest;
});
const secret = `whsec_${randomBytes(32).toString("base64")}`;
const event = {
  type: "email.delivered", created_at: "2026-10-18T08:00:00.000Z",
  data: { email_id: "00000000-0000-4000-8000-000000000573", to: ["fixture@example.test"], subject: "Fixture – été" },
};
const payload = JSON.stringify(event, null, 2);
let state;
beforeEach(() => {
  state = globalThis.__webhookTest = { calls: [], logs: [] };
  process.env.RESEND_WEBHOOK_SECRET = secret;
  process.env.RESEND_API_KEY = "re_synthetic_test_not_a_real_key";
});
function signedHeaders({ prefix = "svix", body = payload, key = secret, timestamp = Math.floor(Date.now() / 1000).toString() } = {}) {
  const id = "msg_synthetic_573";
  const signature = createHmac("sha256", Buffer.from(key.slice(6), "base64"))
    .update(`${id}.${timestamp}.${body}`).digest("base64");
  return { [`${prefix}-id`]: id, [`${prefix}-timestamp`]: timestamp, [`${prefix}-signature`]: `v1,${signature}` };
}
function request(headers = signedHeaders(), body = payload) {
  return new Request("https://app.okado.app/api/webhooks/resend", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body,
  });
}
async function rejected(headers, body = payload) {
  const response = await POST(request(headers, body));
  assert.equal(response.status, 400);
  assert.equal(state.calls.length, 0);
  assert.doesNotMatch(await response.text(), /fixture@example|whsec_|re_synthetic/);
  return response;
}
test("Resend Svix signature accepts exact raw UTF-8 body and persists before acknowledging", async () => {
  const response = await POST(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
  assert.deepEqual(state.calls, [event]);
  assert.equal(state.logs.at(-1)[1], "resend-webhook-received");
});
test("legacy complete header set remains signed, not an authentication bypass", async () => {
  assert.equal((await POST(request(signedHeaders({ prefix: "webhook" })))).status, 200);
  assert.deepEqual(state.calls, [event]);
});
test("Svix headers take precedence over conflicting complete legacy headers", async () => {
  const headers = { ...signedHeaders(), ...signedHeaders({ prefix: "webhook", key: `whsec_${randomBytes(32).toString("base64")}` }) };
  assert.equal((await POST(request(headers))).status, 200);
});
test("headers absent or partial rejected, including attempted downgrade to legacy", async () => {
  await rejected({});
  for (const prefix of ["svix", "webhook"]) {
    for (const suffix of ["id", "timestamp", "signature"]) {
      const headers = signedHeaders({ prefix });
      delete headers[`${prefix}-${suffix}`];
      await rejected(headers);
    }
  }
  await rejected({ ...signedHeaders({ prefix: "webhook" }), "svix-id": "" });
  await rejected({ ...signedHeaders({ prefix: "webhook" }), "svix-id": "partial" });
});
test("invalid Svix signature cannot fall back to valid legacy set", async () => {
  await rejected({ ...signedHeaders({ key: `whsec_${randomBytes(32).toString("base64")}` }), ...signedHeaders({ prefix: "webhook" }) });
});
test("modified body and reserialized JSON rejected without storage", async () => {
  await rejected(signedHeaders(), payload + " ");
  await rejected(signedHeaders(), JSON.stringify(event));
});
test("wrong secret rejected without storage or internal error disclosure", async () => {
  process.env.RESEND_WEBHOOK_SECRET = `whsec_${randomBytes(32).toString("base64")}`;
  await rejected(signedHeaders());
});
test("expired, future or invalid timestamps rejected by the real SDK", async () => {
  for (const timestamp of [Math.floor(Date.now() / 1000) - 600, Math.floor(Date.now() / 1000) + 600, "invalid"]) {
    await rejected(signedHeaders({ timestamp: String(timestamp) }));
  }
});
test("signed malformed JSON rejected before storage", async () => {
  const body = "{not-json";
  await rejected(signedHeaders({ body }), body);
});
test("missing server secret fails closed without storage", async () => {
  delete process.env.RESEND_WEBHOOK_SECRET;
  assert.equal((await POST(request())).status, 500);
  assert.equal(state.calls.length, 0);
});
test("persistence failure returns retryable 503, not invalid signature or false success", async () => {
  state.storageError = "private_db_message fixture@example.test whsec_private";
  const response = await POST(request());
  assert.equal(response.status, 503);
  assert.deepEqual(state.calls, [event]);
  assert.equal(state.logs.at(-1)[1], "resend-webhook-persistence-failed");
  assert.doesNotMatch(JSON.stringify(state.logs) + await response.text(), /private_db_message|fixture@example|whsec_private/);
  state.storageError = null;
  assert.equal((await POST(request())).status, 200);
});
test("verification performs no provider network call", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error("Unexpected external request"); };
  try {
    assert.equal((await POST(request())).status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
