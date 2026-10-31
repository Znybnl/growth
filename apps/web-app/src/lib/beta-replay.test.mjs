import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { betaReplayPolicy } from "./beta-replay-policy.ts";
import { BETA_REPLAY_LEASE_MS, BETA_REPLAY_VERSION, betaReplayPage, validBetaReplayLease } from "./beta-replay-contract.ts";
import { betaReplayUrl, maskBetaReplayText, maskBetaReplayAttribute } from "./beta-replay-privacy.ts";

const now = Date.parse("2026-11-10T12:00:00Z");
const user = { id: "user-fixture", merchantId: "merchant-fixture", createdAt: "2026-10-30T22:59:59.999Z" };

test("all authenticated beta accounts are eligible, including those created after 30 October", () => {
  for (const createdAt of ["2026-10-01T00:00:00Z", "2026-10-30T23:00:00.000Z", "2026-11-01T12:00:00Z"]) {
    assert.equal(betaReplayPolicy({ ...user, createdAt }, "closed_beta", "212872", now).enabled, true);
  }
});

test("public/default phase, unrelated project and anonymous access fail closed", () => {
  for (const phase of [undefined, "", "public", "true", "CLOSED_BETA"]) assert.equal(betaReplayPolicy(user, phase, "212872", now).enabled, false);
  for (const project of [undefined, "272039"]) assert.equal(betaReplayPolicy(user, "closed_beta", project, now).enabled, false);
  assert.equal(betaReplayPolicy(null, "closed_beta", "212872", now).enabled, false);
  assert.equal(betaReplayPolicy({ id: undefined, merchantId: user.merchantId }, "closed_beta", "212872", now).enabled, false);
});

test("server lease expires without polling or trusting client-side dates", () => {
  const policy = betaReplayPolicy(user, "closed_beta", "212872", now);
  assert.equal(policy.subject, "merchant-fixture:user-fixture");
  assert.equal(validBetaReplayLease(policy, now), true);
  assert.equal(validBetaReplayLease(policy, now + BETA_REPLAY_LEASE_MS), false);
  for (const change of [{ expiresAt: now + BETA_REPLAY_LEASE_MS + 1 }, { issuedAt: now + 1 }, { subject: "person@example.test" }, { version: "other" }, { enabled: false }]) {
    assert.equal(validBetaReplayLease({ ...policy, ...change }, now), false);
  }
});

test("public games, authentication, personal data and admin are excluded; URLs remove IDs/query/hash", () => {
  for (const path of ["/campaign/private", "/campaign/private/preview-embed", "/redeem/private", "/connexion", "/inscription", "/account", "/data", "/caisse", "/admin", "/locations", "/unknown", "/dev/beta-replay"]) assert.equal(betaReplayPage(path), null, path);
  assert.equal(betaReplayPage("/campaigns/private-id/edit/guided"), "/campaigns/[id]/edit/guided");
  assert.equal(betaReplayUrl("https://app.okado.app/campaigns/private-id/poster?token=secret#private"), "https://app.okado.app/campaigns/[id]/poster");
  assert.equal(betaReplayUrl("https://app.okado.app/redeem/private"), "https://app.okado.app/redacted");
});

test("free text, attributes and uploads are masked, while fixed UI labels remain readable", () => {
  assert.equal(maskBetaReplayText("Continuer"), "Continuer");
  assert.equal(maskBetaReplayText("person@example.test"), "*******************");
  for (const name of ["href", "src", "id", "title", "aria-label", "data-private", "value"]) assert.equal(maskBetaReplayAttribute(name, "secret@example.test"), "");
  assert.equal(maskBetaReplayAttribute("style", "background: url(secret)"), "");
  assert.equal(maskBetaReplayAttribute("style", "padding: 12px"), "padding: 12px");
  assert.equal(maskBetaReplayAttribute("style", "--private-name: private-css-secret;content:'private-css-secret';width:10px"), "width:10px");
  const css = { tagName: "LINK", getAttribute: name => name === "rel" ? "stylesheet" : "/_next/static/chunks/%5Broot-of-the-server%5D__0ry6g9mr6y4s7._.css?cache=1" };
  assert.equal(maskBetaReplayAttribute("_cssText", ".p-8 {padding: 2rem}", css), ".p-8 {padding: 2rem}");
  const externalCss = { tagName: "LINK", getAttribute: name => name === "rel" ? "stylesheet" : "https://private.example/_next/static/css/private.css" };
  assert.equal(maskBetaReplayAttribute("_cssText", "private-css-secret", externalCss), "");
  assert.equal(maskBetaReplayAttribute("_cssText", "private-css-secret"), "");
  assert.equal(maskBetaReplayAttribute("href", "https://private.example/_next/static/private.css"), "");
});

// Real route handler, with auth as the only test double; no database or customer data.
let session = { user };
let authCalls = 0;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/auth") return { url: "data:text/javascript,export const getAuthenticatedSession=()=>globalThis.__betaReplayAuth()", shortCircuit: true };
  return next(specifier, context);
} });
globalThis.__betaReplayAuth = async () => { authCalls++; if (session instanceof Error) throw session; return session; };
const { GET } = await import("../app/api/analytics/beta-replay-policy/route.ts");

test("private policy authenticates the actual user and ignores client claims; kill switch survives auth outage", async () => {
  process.env.OKADO_REPLAY_PHASE = "closed_beta";
  process.env.POSTHOG_PROJECT_ID = "212872";
  let response = await GET(new Request("https://app.okado.app/api/analytics/beta-replay-policy?createdAt=2020-01-01"));
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.equal((await response.json()).version, BETA_REPLAY_VERSION);
  session = { user: { ...user, createdAt: "2026-11-01T00:00:00Z" } };
  assert.equal((await (await GET()).json()).enabled, true);
  session = null;
  assert.equal((await GET()).status, 401);
  session = new Error("Auth unavailable");
  assert.equal((await GET()).status, 503);
  const calls = authCalls;
  process.env.OKADO_REPLAY_PHASE = "public";
  response = await GET();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).enabled, false);
  assert.equal(authCalls, calls);
});

test("missing client key or disabled client tracking creates no SDK, timer, listener or request", async () => {
  const { startBetaReplayBoundary } = await import("./beta-replay-client.ts");
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const enabled = process.env.NEXT_PUBLIC_POSTHOG_ENABLED;
  try {
    // No browser globals are provided: even registering a listener would fail this test.
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    startBetaReplayBoundary()();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_fixture";
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED = "false";
    startBetaReplayBoundary()();
  } finally {
    if (key === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY; else process.env.NEXT_PUBLIC_POSTHOG_KEY = key;
    if (enabled === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_ENABLED; else process.env.NEXT_PUBLIC_POSTHOG_ENABLED = enabled;
  }
});
