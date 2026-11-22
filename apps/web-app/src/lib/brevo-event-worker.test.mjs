import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";

const src = new URL("../", import.meta.url);
const mocks = {
  "@/lib/admin": "export const isSaasAdminEmail=()=>false;",
  "@/lib/product-analytics": "export const captureProductEvent=async()=>{};export const merchantDistinctId=()=>'';",
  "@/lib/supabase": "export const getSupabaseAdmin=()=>globalThis.__brevoWorker.db;export const isSupabaseConfigured=()=>true;",
  "@/lib/support-log": "export const logSupportEvent=(...args)=>globalThis.__brevoWorker.logs.push(args);",
};
registerHooks({
  resolve(name, context, next) {
    if (name === "next/server") return next("next/server.js", context);
    if (mocks[name]) return { url: "data:text/javascript," + encodeURIComponent(mocks[name]), shortCircuit: true };
    if (name.startsWith("@/")) {
      const file = new URL(name.slice(2) + ".ts", src);
      return next(existsSync(file) ? file.href : new URL(name.slice(2) + ".tsx", src).href, context);
    }
    return next(name, context.parentURL?.startsWith("data:") ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith(src.href) && /\.tsx?$/.test(url)) {
      return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});

const { dispatchBrevoEventRetries } = await import("./brevo.ts");
const job = {
  dedupe_key: "hashed-retry-key", merchant_id: "merchant-demo", merchant_user_id: "user-demo",
  event_name: "okado_trial_started", event_properties: { merchant_id: "merchant-demo" },
  attempts: 2, created_at: "2026-11-17T10:00:00.000Z",
};
let state;

function makeDb(row = job) {
  let claimed = row ? [row] : [];
  return {
    updates: [],
    async rpc(name) {
      assert.equal(name, "claim_brevo_event_retry");
      return { data: claimed.splice(0, 1), error: null };
    },
    from(table) {
      if (table === "merchant_users") return {
        select() { return { eq() { return { maybeSingle: async () => ({ data: { email: "merchant@example.test" }, error: null }) }; } }; },
      };
      return {
        update(values) {
          this.owner.updates.push(values);
          const query = { eq() { return query; }, then(resolve, reject) { return Promise.resolve({ error: null }).then(resolve, reject); } };
          return query;
        },
        owner: this,
      };
    },
  };
}

beforeEach(() => {
  state = globalThis.__brevoWorker = { logs: [], db: null };
});

test("un HTTP 503 conserve l’événement en reprise et ne journalise pas l’adresse", async () => {
  const previousKey = process.env.BREVO_API_KEY;
  const previousFetch = globalThis.fetch;
  try {
    process.env.BREVO_API_KEY = "test-api-key";
    state.db = makeDb();
    globalThis.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.equal(payload.event_date, job.created_at);
      assert.equal(payload.identifiers.email_id, "merchant@example.test");
      return new Response(null, { status: 503 });
    };
    const result = await dispatchBrevoEventRetries();
    assert.deepEqual(result, { skipped: false, processed: 1, sent: 0, retrying: 1, needsReview: 0, limitReached: false });
    assert.equal(state.db.updates[0].status, "retry");
    assert.equal(state.db.updates[0].last_error_status, 503);
    assert.ok(Date.parse(state.db.updates[0].next_attempt_at) > Date.now());
    assert.doesNotMatch(JSON.stringify(state.logs), /merchant@example\.test/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousKey;
  }
});

test("une réponse réseau ambiguë passe à vérifier sans nouvelle échéance", async () => {
  const previousKey = process.env.BREVO_API_KEY;
  const previousFetch = globalThis.fetch;
  try {
    process.env.BREVO_API_KEY = "test-api-key";
    state.db = makeDb();
    globalThis.fetch = async () => { throw Error("provider-accepted-but-response-lost"); };
    const result = await dispatchBrevoEventRetries();
    assert.equal(result.needsReview, 1);
    assert.equal(state.db.updates[0].status, "needs_review");
    assert.equal(state.db.updates[0].last_error_code, "network_outcome_ambiguous");
    assert.equal(state.db.updates[0].next_attempt_at, null);
    assert.doesNotMatch(JSON.stringify(state.logs), /merchant@example\.test|provider-accepted/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousKey;
  }
});
