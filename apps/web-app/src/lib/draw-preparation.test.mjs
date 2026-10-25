import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function fixture() {
  const state = { logs: [], calls: [], preview: false, required: false, fail: null, malformed: false };
  const campaign = { id: "private-campaign", gameType: "wheel", googleClickRequired: true,
    actions: [{ id: "private-action", kind: "google" }], rewardRules: { participationIntervalDays: 1 } };
  const operation = name => async () => {
    state.calls.push(name);
    if (state.fail === name) throw new Error("private-error");
  };
  const result = { campaign, session: { id: "private-session", expiresAt: "2026-10-25T20:00:00Z" }, prize: null };
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options) => Object.assign(Response.json(body, options), { cookies: { set: () => state.calls.push("cookie") } }) } },
    "@/lib/public-api": { isValidPublicIdentifier: id => id !== "invalid", assertDailyParticipationCookie() {},
      getDailyParticipationCookieName: () => "cookie", getDailyParticipationCookieOptions: () => ({}), getDailyParticipationCookieValue: () => "value",
      getPublicErrorStatus: () => 503, getPublicRetryAfter: () => undefined, isDailyParticipationError: () => false },
    "@/lib/public-security-store": { assertPersistentPublicRateLimit: operation("limit"), assertPersistentDailyParticipationLock: operation("lock"), releasePersistentDailyParticipationLock: operation("release") },
    "@/lib/store": { getPublicCampaign: async () => { await operation("campaign")(); return campaign; },
      createDrawSession: async () => { await operation("session")(); return structuredClone(result); },
      createPreviewDrawSession: async () => { await operation("preview")(); return structuredClone(result); } },
    "@/lib/product-analytics": { captureProductEvent: operation("analytics") },
    "@/lib/support-log": { logSupportEvent() {} },
    "@/lib/preview-token": { verifyPreviewAccessToken: () => state.preview, issuePreviewSessionToken: () => "private-preview-token" },
    "@/lib/participation-token": { publicPlayerToken: () => "private-player", verifyMarketingClickToken: () => null, issueParticipationToken: () => "private-participation-token" },
    "@/lib/google-click-policy": { requiresGoogleClick: () => state.required },
  };
  const mod = { exports: {} };
  let clock = 0;
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../app/api/public/draw/session/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module: mod, exports: mod.exports, performance: { now: () => ++clock }, Date,
    console: { info: line => state.logs.push(JSON.parse(line)) },
    require: name => { if (!(name in dependencies)) throw Error(`Unexpected module ${name}`); return dependencies[name]; } });
  const request = body => ({ json: async () => { if (state.malformed) throw Error("private-invalid-body"); return body; }, cookies: { get: () => undefined } });
  return { state, post: body => mod.exports.POST(request(body)) };
}

test("real and preview have one anonymous result; no extra operation, same response/cookie", async () => {
  const { state, post } = fixture();
  const response = await post({ campaignId: "private-campaign" });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).session.participationToken, "private-participation-token");
  assert.deepEqual(state.calls, ["limit", "campaign", "lock", "session", "analytics", "cookie"]);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].mode, "production");
  assert.ok(state.logs[0].stages.campaignLookup > 0);
  assert.ok(state.logs[0].stages.dailyLock > 0);
  assert.ok(state.logs[0].stages.analytics > 0);
  assert.doesNotMatch(JSON.stringify(state.logs), /private-|campaignId|sessionId|email|token/i);
  state.preview = true; state.calls.length = 0;
  assert.equal((await post({ campaignId: "private-campaign", previewToken: "private-token" })).status, 201);
  assert.deepEqual(state.calls, ["limit", "preview"]);
  assert.equal(state.logs[1].mode, "preview");
  assert.equal(state.logs[1].stages.dailyLock, undefined);
});

test("refusals and failed work measured without bypassing Google, rate limit or lock release", async () => {
  const { state, post } = fixture();
  state.required = true;
  assert.equal((await post({ campaignId: "private-campaign" })).status, 403);
  assert.deepEqual(state.calls, ["limit", "campaign"]);
  assert.equal(state.logs[0].status, 403);
  state.required = false; state.fail = "session"; state.calls.length = 0;
  assert.equal((await post({ campaignId: "private-campaign" })).status, 503);
  assert.deepEqual(state.calls, ["limit", "campaign", "lock", "session", "release"]);
  assert.ok(state.logs[1].stages.sessionCreation > 0);
  assert.ok(state.logs[1].stages.releaseLock > 0);
  assert.equal(state.logs[1].status, 503);
  state.fail = "limit"; state.calls.length = 0;
  assert.equal((await post({ campaignId: "private-campaign" })).status, 503);
  assert.deepEqual(state.calls, ["limit"]);
  assert.ok(state.logs[2].stages.rateLimit > 0);
  assert.equal(state.logs[2].stages.sessionCreation, undefined);
});

test("early validation and invalid JSON still produce one result without a session", async () => {
  const { state, post } = fixture();
  assert.equal((await post({ campaignId: "invalid" })).status, 400);
  assert.deepEqual(state.calls, []);
  assert.equal(state.logs[0].status, 400);
  state.malformed = true;
  await assert.rejects(post({}), /private-invalid-body/);
  assert.equal(state.logs[1].status, 500);
  assert.equal(state.logs[1].mode, "unknown");
  assert.ok(state.logs[1].stages.parse > 0);
  assert.doesNotMatch(JSON.stringify(state.logs), /private-|invalid-body/);
});
