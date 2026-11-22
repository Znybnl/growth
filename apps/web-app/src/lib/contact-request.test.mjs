import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

const source = new URL("../", import.meta.url);
registerHooks({
  resolve(name, context, next) {
    if (name === "next/server") return next("next/server.js", context);
    if (name === "@/lib/auth") return {
      url: "data:text/javascript,export const getAuthenticatedSession=async()=>globalThis.__contactTest.session",
      shortCircuit: true,
    };
    if (name === "@/lib/supabase") return {
      url: "data:text/javascript,export const getSupabaseAdmin=()=>globalThis.__contactTest.db",
      shortCircuit: true,
    };
    if (name === "resend") return {
      url: "data:text/javascript,export class Resend{constructor(){this.emails={send:async(...args)=>{globalThis.__contactTest.sends.push(args);if(globalThis.__contactTest.sendFails)throw Error('private@example.test');return {data:{id:'accepted-test'},error:null}}}}}",
      shortCircuit: true,
    };
    if (name.startsWith("@/")) return next(new URL(name.slice(2) + ".ts", source).href, context);
    return next(name, context);
  },
});

const route = await import("../app/api/merchant/contact/route.ts");
const { parseContactRequest } = await import("./contact-request.ts");
const requestId = "123e4567-e89b-42d3-a456-426614174000";
let state;

beforeEach(() => {
  process.env.RESEND_API_KEY = "test-only";
  process.env.RESEND_FROM_EMAIL = "sender@okado.app";
  state = globalThis.__contactTest = {
    session: { user: { id: "user-1", email: "marchand@example.test" }, merchant: { onboardingCompleted: true } },
    sends: [], calls: [],
  };
  state.db = {
    async rpc(name, args) {
      state.calls.push([name, args]);
      return state.rateError ? { error: { message: "private@example.test" } } :
        { data: { allowed: !state.limited, retry_after_seconds: 40 }, error: null };
    },
  };
});

const makeRequest = (body, origin = "https://app.okado.app") => new Request("https://app.okado.app/api/merchant/contact", {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify(body),
});
const valid = { subject: "Problème de connexion", message: "Bonjour, je ne peux pas ouvrir mon compte.", requestId };

test("l'envoi utilise la session pour Reply-To et une adresse Okado pour From", async () => {
  const response = await route.POST(makeRequest({ ...valid, email: "pirate@example.test", to: "pirate@example.test" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(await response.json(), { sent: true });
  assert.equal(state.sends.length, 1);
  const [email, options] = state.sends[0];
  assert.equal(email.to, "contact@okado.app");
  assert.equal(email.from, "Okado <sender@okado.app>");
  assert.equal(email.replyTo, "marchand@example.test");
  assert.equal(email.subject, "[Okado] Problème de connexion");
  assert.match(email.text, /Bonjour, je ne peux pas ouvrir mon compte/);
  assert.doesNotMatch(JSON.stringify(email), /pirate@example.test/);
  assert.deepEqual(options, { idempotencyKey: `contact/user-1/${requestId}` });
  assert.deepEqual(state.calls, [["consume_public_rate_limit", {
    p_key: "contact-user:user-1", p_limit: 5, p_window_seconds: 3600,
  }]]);
});

test("visiteur, origine externe et compte incomplet sont refusés avant l'envoi", async () => {
  state.session = null;
  assert.equal((await route.POST(makeRequest(valid))).status, 401);
  state.session = { user: { id: "user-1", email: "marchand@example.test" }, merchant: { onboardingCompleted: false } };
  assert.equal((await route.POST(makeRequest(valid))).status, 401);
  state.session.merchant.onboardingCompleted = true;
  assert.equal((await route.POST(makeRequest(valid, "https://evil.example.test"))).status, 403);
  assert.equal(state.sends.length, 0);
  assert.equal(state.calls.length, 0);
});

test("les entrées invalides ne déclenchent aucun envoi ni limiteur", async () => {
  for (const body of [
    { ...valid, subject: "  " },
    { ...valid, subject: "ligne\nBcc: pirate@example.test" },
    { ...valid, subject: "x".repeat(121) },
    { ...valid, message: "x".repeat(4001) },
    { ...valid, requestId: "invalid" },
  ]) {
    assert.equal((await route.POST(makeRequest(body))).status, 400);
  }
  assert.equal(parseContactRequest(valid)?.subject, valid.subject);
  assert.equal(state.calls.length, 0);
  assert.equal(state.sends.length, 0);
});

test("un refus du limiteur ou du fournisseur ne confirme jamais l'envoi", async () => {
  state.limited = true;
  const limited = await route.POST(makeRequest(valid));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "40");
  assert.equal(state.sends.length, 0);

  state.limited = false;
  state.sendFails = true;
  const failed = await route.POST(makeRequest(valid));
  assert.equal(failed.status, 503);
  assert.doesNotMatch(await failed.text(), /private@example.test/);
  assert.equal(state.sends.length, 1);

  state.rateError = true;
  assert.equal((await route.POST(makeRequest(valid))).status, 503);
  assert.equal(state.sends.length, 1);
});
