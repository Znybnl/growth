import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { merchantAnalyticsDistinctId } from "./analytics-identity.ts";

const require = createRequire(import.meta.url);
const { NextResponse } = require("next/server");

function load(relativePath, dependencies, globals = {}) {
  const mod = { exports: {} };
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module: mod, exports: mod.exports, URL, Request, Response,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    }, ...globals });
  return mod.exports;
}

function callbackFixture() {
  const state = { isNew: true, completed: false, exchangeFailure: false, analyticsFailure: false,
    deferred: [], events: [], provisions: 0 };
  const route = load("../app/api/auth/google/callback/route.ts", {
    "next/server": { NextResponse, after: task => state.deferred.push(task) },
    "@/lib/affiliate-repository": { createAffiliateReferralForMerchant: async () => undefined },
    "@/lib/admin-notifications": { notifyAdministratorsOfMerchantSignup: async () => undefined },
    "@/lib/brevo": { syncMerchantContactToBrevo: async () => undefined },
    "@/lib/product-analytics": {
      merchantDistinctId: merchantAnalyticsDistinctId,
      captureProductEvent: async (event, distinctId, properties) => {
        state.events.push({ event, distinctId, properties });
        if (state.analyticsFailure) throw new Error("analytics unavailable");
      },
    },
    "@/lib/merchant-account-repository": {
      authenticateOrProvisionMerchantWithGoogle: async () => {
        state.provisions++;
        return { isNew: state.isNew, merchant: { id: "merchant-fixture", onboardingCompleted: state.completed },
          user: { id: "user-fixture", merchantId: "merchant-fixture", email: "private@example.test" } };
      },
    },
    "@/lib/session-security-server": {
      setSessionSecurityCookies: response => response.cookies.set("fixture-security", "present"),
    },
    "@/lib/supabase-server-auth": {
      createRouteSupabaseClient: ({ response }) => {
        response.cookies.set("fixture-auth", "present");
        return { auth: { exchangeCodeForSession: async () => state.exchangeFailure
          ? { data: { user: null }, error: new Error("exchange refused") }
          : { data: { user: { id: "auth-fixture", email: "private@example.test",
            user_metadata: { full_name: "Private Profile" } } }, error: null } } };
      },
    },
  });
  const get = (query = "?code=synthetic&next=/campaigns") => route.GET(new Request(`https://app.okado.app/api/auth/google/callback${query}`));
  return { state, get };
}

test("new Google account: signup captured after the response, onboarding redirect and cookies preserved", async () => {
  const { state, get } = callbackFixture();
  const response = await get();
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/onboarding");
  assert.equal(response.cookies.get("fixture-auth").value, "present");
  assert.equal(response.cookies.get("fixture-security").value, "present");
  assert.equal(state.provisions, 1);
  assert.equal(state.events.length, 0);
  assert.equal(state.deferred.length, 1);
  await state.deferred[0]();
  assert.equal(state.events.length, 1);
  assert.equal(state.events[0].event, "signup_completed");
  assert.equal(state.events[0].distinctId, "merchant-fixture:user-fixture");
  assert.equal(state.events[0].properties.authProvider, "google");
  assert.equal(state.events[0].properties.merchantUserId, "user-fixture");
  assert.doesNotMatch(JSON.stringify(state.events), /private@example|Private Profile|synthetic/);
});

test("returning Google accounts never produce another signup; incomplete/complete redirects stay distinct", async () => {
  for (const completed of [false, true]) {
    const { state, get } = callbackFixture();
    state.isNew = false;
    state.completed = completed;
    const response = await get();
    assert.equal(new URL(response.headers.get("location")).pathname, completed ? "/campaigns" : "/onboarding");
    await state.deferred[0]();
    assert.equal(state.events.length, 0);
  }
});

test("Google failure or missing code produces no signup or deferred work", async () => {
  for (const exchangeFailure of [false, true]) {
    const { state, get } = callbackFixture();
    state.exchangeFailure = exchangeFailure;
    const response = await get(exchangeFailure ? "?code=synthetic" : "?error=access_denied");
    assert.equal(new URL(response.headers.get("location")).pathname, "/connexion");
    assert.equal(state.provisions, 0);
    assert.equal(state.events.length, 0);
    assert.equal(state.deferred.length, 0);
  }
});

test("an analytics outage cannot invalidate successful Google authentication", async () => {
  const { state, get } = callbackFixture();
  state.analyticsFailure = true;
  const response = await get();
  await assert.doesNotReject(state.deferred[0]());
  assert.equal(new URL(response.headers.get("location")).pathname, "/onboarding");
  assert.equal(response.cookies.get("fixture-auth").value, "present");
});

test("the real onboarding screen identifies the account before flow events, with the active site kept separate", () => {
  const Identity = () => null;
  const Flow = () => null;
  const { OnboardingScreen } = load("../components/auth/onboarding-screen.tsx", {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@/components/auth/auth-shell": { AuthShell: () => null },
    "@/components/auth/onboarding-flow": { OnboardingFlow: Flow },
    "@/components/merchant/merchant-analytics-identity": { MerchantAnalyticsIdentity: Identity },
    "@/components/merchant/merchant-session-guard": { MerchantSessionGuard: () => null },
  });
  const screen = OnboardingScreen({ merchant: { id: "merchant-active" },
    user: { id: "user-fixture", merchantId: "merchant-account", email: "fixture@example.test" } });
  const children = screen.props.children;
  const identity = children.find(child => child.type === Identity);
  assert.equal(identity.props.accountMerchantId, "merchant-account");
  assert.equal(identity.props.activeMerchantId, "merchant-active");
  assert.equal(identity.props.userId, "user-fixture");
  assert.ok(children.indexOf(identity) < children.findIndex(child => child.type === Flow));
});

test("the onboarding page still requires the authenticated server session before showing the screen", async () => {
  const Screen = () => null;
  let authenticated = false;
  const page = load("../app/onboarding/page.tsx", {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@/components/auth/onboarding-screen": { OnboardingScreen: Screen },
    "@/lib/auth": { requireAuthenticatedSession: async () => {
      if (!authenticated) throw new Error("redirect to signin");
      return { merchant: { id: "merchant-fixture" }, user: { id: "user-fixture",
        merchantId: "merchant-fixture", email: "fixture@example.test", password: "private-secret" } };
    } },
  });
  await assert.rejects(page.default(), /redirect to signin/);
  authenticated = true;
  const screen = await page.default();
  assert.equal(screen.type, Screen);
  assert.equal(screen.props.user.id, "user-fixture");
  assert.equal(Object.keys(screen.props.user).length, 3);
  assert.equal(screen.props.user.password, undefined);
});
