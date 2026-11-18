import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";

const mocks = {
  "@/lib/brevo": "export const dispatchBrevoEmailDecisionEvents=async()=>{if(globalThis.__decision.throw)throw Error('private-provider-response');return globalThis.__decision.result};",
  "@/lib/support-task-log": "export const recordBrevoEventRetryRun=async(...args)=>{globalThis.__decision.records.push(args)};",
};
registerHooks({
  resolve(name, context, next) {
    if (name === "next/server") return next("next/server.js", context);
    if (mocks[name]) return { url: "data:text/javascript," + encodeURIComponent(mocks[name]), shortCircuit: true };
    return next(name, context);
  },
});

const route = await import("../app/api/internal/brevo-email-decisions/route.ts");
let state;
beforeEach(() => {
  state = globalThis.__decision = { throw: false, result: { skipped: false, processed: 2, emitted: 1, failed: 0 }, records: [] };
});

test("route décisionnelle protégée par CRON_SECRET", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "test-only";
    assert.equal((await route.GET(new Request("https://app.okado.app/api/internal/brevo-email-decisions"))).status, 401);
    const response = await route.GET(new Request("https://app.okado.app/api/internal/brevo-email-decisions", { headers: { authorization: "Bearer test-only" } }));
    assert.equal(response.status, 200);
    assert.deepEqual(state.records, [[{ processed: 2, sent: 1, needsReview: 0, skipped: false }, false]]);
    assert.doesNotMatch(await response.text(), /@|private-provider-response/);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("échec interne retourné sans détail fournisseur", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = "test-only";
    state.throw = true;
    const response = await route.GET(new Request("https://app.okado.app/api/internal/brevo-email-decisions", { headers: { authorization: "Bearer test-only" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(state.records, [[{}, true]]);
    assert.doesNotMatch(await response.text(), /private-provider-response/);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
