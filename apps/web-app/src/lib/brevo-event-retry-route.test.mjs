import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

const mocks = {
  "@/lib/brevo": "export const dispatchBrevoEventRetries=async()=>{if(globalThis.__brevoRetry.throw)throw Error('private-provider-response');return globalThis.__brevoRetry.result};",
  "@/lib/support-task-log": "export const recordBrevoEventRetryRun=async(...args)=>{globalThis.__brevoRetry.records.push(args)};",
};
registerHooks({
  resolve(name, context, next) {
    if (name === "next/server") return next("next/server.js", context);
    if (mocks[name]) return { url: "data:text/javascript," + encodeURIComponent(mocks[name]), shortCircuit: true };
    return next(name, context);
  },
});

const route = await import("../app/api/internal/brevo-events/retry/route.ts");
let state;
beforeEach(() => {
  state = globalThis.__brevoRetry = { throw: false, result: { processed: 1, sent: 1, retrying: 0, needsReview: 0 }, records: [] };
});

test("la route planifiée refuse un secret absent ou incorrect avant de traiter la file", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await route.GET(new Request("https://app.okado.app/api/internal/brevo-events/retry"))).status, 401);
    process.env.CRON_SECRET = "test-only";
    assert.equal((await route.GET(new Request("https://app.okado.app/api/internal/brevo-events/retry", {
      headers: { authorization: "Bearer wrong" },
    }))).status, 401);
    assert.equal(state.records.length, 0);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("la route enregistre les résultats sans données de contact", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "test-only";
    const response = await route.GET(new Request("https://app.okado.app/api/internal/brevo-events/retry", {
      headers: { authorization: "Bearer test-only" },
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(state.records, [[state.result]]);
    assert.doesNotMatch(await response.text(), /@|private-provider-response/);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("une panne est journalisée et exposée sans message interne", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "test-only";
    state.throw = true;
    const response = await route.GET(new Request("https://app.okado.app/api/internal/brevo-events/retry", {
      headers: { authorization: "Bearer test-only" },
    }));
    assert.equal(response.status, 503);
    assert.deepEqual(state.records, [[{}, true]]);
    assert.doesNotMatch(await response.text(), /private-provider-response/);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
