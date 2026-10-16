import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// No SDK requests, real cookies, Supabase writes or production credentials.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_consent_fixture";
delete process.env.NEXT_PUBLIC_POSTHOG_ENABLED;
const root = new URL("../../../../", import.meta.url);
let state;
registerHooks({
  resolve(name, context, next) {
    if (name === "next/headers") return {
      url: "data:text/javascript,export const cookies=async()=>{if(globalThis.__consentFixture.noRequest)throw Error('No request');return {get:()=>({value:globalThis.__consentFixture.cookieValue})}}",
      shortCircuit: true,
    };
    if (name === "posthog-js") return {
      url: "data:text/javascript,export default {init:(key,config)=>{globalThis.__consentFixture.init.push({key,config})},opt_out_capturing:()=>globalThis.__consentFixture.calls.push('out'),opt_in_capturing:()=>globalThis.__consentFixture.calls.push('in'),set_config:config=>globalThis.__consentFixture.calls.push(config),reset:()=>globalThis.__consentFixture.calls.push('reset'),capture:(...args)=>globalThis.__consentFixture.events.push(args),identify:(...args)=>globalThis.__consentFixture.identities.push(args),captureLog:log=>globalThis.__consentFixture.logs.push(log)}",
      shortCircuit: true,
    };
    if (name.startsWith("@/")) {
      const app = context.parentURL.includes("/landing-page/") ? "landing-page" : "web-app";
      return next(new URL(`apps/${app}/src/${name.slice(2)}.ts`, root).href, context);
    }
    return next(name, context);
  },
});

function browser() {
  const cookies = new Map();
  const listeners = new Map();
  state = globalThis.__consentFixture = { init: [], calls: [], events: [], identities: [], logs: [] };
  globalThis.document = {
    get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); },
    set cookie(value) {
      const [pair] = value.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      if (value.includes("Max-Age=0")) cookies.delete(name);
      else cookies.set(name, pair.slice(separator + 1));
    },
    addEventListener() {},
  };
  const storage = () => Object.create(null, { removeItem: { value(key) { delete this[key]; } } });
  globalThis.window = {
    location: { hostname: "app.okado.app", protocol: "https:", pathname: "/inscription", search: "?utm_campaign=person%40example.test" },
    localStorage: storage(), sessionStorage: storage(),
    addEventListener(name, fn) { listeners.set(name, fn); },
    dispatchEvent(event) { listeners.get(event.type)?.(); },
    setInterval() {},
  };
  return cookies;
}

test("les deux applications partagent le protocole, les gardes et le composant de choix", () => {
  for (const path of ["lib/analytics-consent.ts", "lib/consent-managed-analytics.ts", "components/privacy/cookie-preferences.tsx"]) {
    assert.equal(
      readFileSync(new URL(`apps/web-app/src/${path}`, root), "utf8"),
      readFileSync(new URL(`apps/landing-page/src/${path}`, root), "utf8"),
      path,
    );
  }
});

for (const app of ["web-app", "landing-page"]) {
  test(`${app} : aucun SDK avant accord, refus, retrait, nouvel accord et données minimisées`, async () => {
    const jar = browser();
    const consent = await import(new URL(`apps/${app}/src/lib/analytics-consent.ts`, root));
    const client = await import(new URL(`apps/${app}/src/lib/consent-managed-analytics.ts`, root));
    const now = Date.now();
    const value = (choice, decidedAt = now, version = consent.ANALYTICS_CONSENT_VERSION) =>
      encodeURIComponent(JSON.stringify({ choice, decidedAt, version }));
    for (const invalid of [undefined, "garbage", "null", "%zz", value("accepted", now + 10000), value("accepted", now - consent.ANALYTICS_CONSENT_MAX_AGE * 1000), value("accepted", now, "old"), value("unknown")]) {
      assert.equal(consent.parseAnalyticsConsent(invalid, now), null);
    }
    assert.equal(consent.parseAnalyticsConsent(value("rejected"), now).choice, "rejected");
    assert.equal(consent.analyticsCookieDomain("fakeokado.app"), "");
    assert.equal(consent.analyticsCookieDomain("okado.app.evil.test"), "");
    assert.equal(consent.analyticsCookieDomain("localhost"), "");
    assert.equal(consent.analyticsCookieDomain("www.okado.app"), "; Domain=okado.app");

    jar.set("ph_phc_consent_fixture_posthog", "legacy");
    window.localStorage.ph_phc_consent_fixture_posthog = "legacy";
    window.localStorage.unrelated = "keep";
    client.startConsentManagedAnalytics();
    assert.equal(state.init.length, 0);
    assert.equal(jar.has("ph_phc_consent_fixture_posthog"), false);
    assert.equal(window.localStorage.ph_phc_consent_fixture_posthog, undefined);
    assert.equal(window.localStorage.unrelated, "keep");
    assert.equal(client.setAnalyticsChoice("rejected"), true);
    assert.equal(state.init.length, 0);
    assert.equal(client.setAnalyticsChoice("accepted"), true);
    assert.equal(state.init.length, 1);
    const config = state.init[0].config;
    assert.equal(config.autocapture, false);
    assert.equal(config.disable_session_recording, true);
    assert.equal(config.advanced_disable_flags, true);
    const sanitized = config.before_send({ event: "$identify", $set: { email: "private@example.test" }, $set_once: { $initial_current_url: "https://example.test/?token=secret" }, properties: {
      token: "public-project-token", distinct_id: "merchant:user", $anon_distinct_id: "anonymous",
      email: "person@example.test", $current_url: "https://example.test/?token=secret",
      $initial_referrer: "https://example.test/?email=private", $set: { email: "private" },
      merchantId: "merchant", cta: "start_trial",
    } });
    assert.equal(sanitized.properties.token, "public-project-token");
    assert.equal(sanitized.properties.$anon_distinct_id, "anonymous");
    assert.equal(sanitized.properties.merchantId, "merchant");
    assert.equal(sanitized.properties.consentVersion, consent.ANALYTICS_CONSENT_VERSION);
    assert.equal(JSON.stringify(sanitized).includes("person@example"), false);
    assert.equal(sanitized.properties.$current_url, undefined);
    assert.equal(sanitized.properties.$set, undefined);
    assert.equal(sanitized.$set, undefined);
    assert.equal(sanitized.$set_once, undefined);
    assert.equal(sanitized.properties.page, "/inscription");
    for (const path of ["/", "/restaurants", "/instituts-beaute", "/tarifs", "/onboarding", "/guides/lots-restaurant"]) {
      assert.equal(client.safeAnalyticsPage(path), path);
    }
    for (const path of ["/campaign/private-id", "/redeem/secret", "/auth/callback", "/api/private", "/guides/person@example.test"]) {
      assert.equal(client.safeAnalyticsPage(path), "/other");
    }
    window.location.search = "?utm_source=google&utm_medium=cpc&utm_campaign=launch_2026&email=private%40example.test#secret";
    const acquisition = config.before_send({ event: "$pageview", properties: {} }).properties;
    assert.equal(acquisition.utmSource, "google");
    assert.equal(acquisition.utmMedium, "cpc");
    assert.equal(acquisition.utmCampaign, "launch_2026");
    assert.equal(JSON.stringify(acquisition).includes("#secret"), false);
    assert.equal(JSON.stringify(acquisition).includes("private@"), false);
    window.location.pathname = "/redeem/private-gain";
    window.location.search = "?utm_source=private%40example.test&utm_medium=cpc&utm_campaign=launch_2026";
    const restricted = config.before_send({ event: "$pageview", properties: {} }).properties;
    assert.equal(restricted.page, "/other");
    assert.equal(restricted.utmSource, undefined);
    assert.equal(restricted.utmCampaign, "launch_2026");
    window.location.pathname = "/inscription";
    window.location.search = "?utm_campaign=person%40example.test";
    const remembered = document.cookie;
    client.syncAnalyticsConsent();
    assert.equal(document.cookie, remembered, "la visite ne prolonge pas le choix");
    if (app === "web-app") {
      const analytics = await import("./client-product-analytics.ts");
      const { captureClientError } = await import("./client-observability.ts");
      const sdk = (await import("posthog-js")).default;
      const originalCapture = sdk.capture;
      analytics.identifyMerchantForAnalytics("merchant", "user");
      assert.equal(sdk.capture, originalCapture, "le transport natif est restauré après identify");
      analytics.captureClientProductEvent("signup_started", { email: "private" });
      captureClientError("campaign_setup_failed", Error("private@example.test"), { email: "private", mode: "create" });
      assert.equal(state.identities.length, 1);
      assert.equal(state.events.length, 1);
      assert.deepEqual(state.events[0][2], { transport: "sendBeacon", send_instantly: true });
      assert.equal(state.logs.length, 1);
      assert.equal(state.logs[0].attributes.email, undefined);
      assert.equal(JSON.stringify(state.logs).includes("private@example"), false);
    } else {
      const analytics = await import(new URL("apps/landing-page/src/lib/marketing-analytics.ts", root));
      analytics.captureMarketingEvent("marketing_cta_clicked", { cta: "start_trial" });
      assert.equal(state.events[0][1].utmCampaign, undefined);
      assert.deepEqual(state.events[0][2], { transport: "sendBeacon", send_instantly: true });
    }
    assert.equal(client.setAnalyticsChoice("rejected"), true);
    assert.ok(state.calls.includes("out"));
    assert.ok(state.calls.includes("reset"));
    assert.equal(config.before_send({ properties: {} }), null);
    if (app === "web-app") {
      const analytics = await import("./client-product-analytics.ts");
      const { captureClientError } = await import("./client-observability.ts");
      analytics.identifyMerchantForAnalytics("other", "other");
      analytics.captureClientProductEvent("signup_started");
      captureClientError("campaign_setup_failed", Error("fixture"));
      assert.equal(state.identities.length, 1);
      assert.equal(state.events.length, 1);
      assert.equal(state.logs.length, 1);
    }
    assert.equal(client.setAnalyticsChoice("accepted"), true);
    assert.ok(state.calls.includes("in"));
  });
}

test("identité : envoi immédiat unique, options préservées et capture restaurée même en échec", async () => {
  const jar = browser();
  const consent = await import("./analytics-consent.ts");
  jar.set(consent.ANALYTICS_CONSENT_COOKIE, encodeURIComponent(JSON.stringify({ version: consent.ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })));
  const analytics = await import("./client-product-analytics.ts");
  const sdk = (await import("posthog-js")).default;
  const originalIdentify = sdk.identify;
  const originalCapture = sdk.capture;
  try {
    sdk.identify = () => sdk.capture("$identify", { distinct_id: "merchant:user", $anon_distinct_id: "anonymous" }, { $set: { merchantId: "merchant" } });
    analytics.identifyMerchantForAnalytics("merchant", "user");
    assert.equal(state.events.length, 1);
    assert.deepEqual(state.events[0][2], { $set: { merchantId: "merchant" }, transport: "sendBeacon", send_instantly: true });
    assert.equal(sdk.capture, originalCapture);
    sdk.identify = () => { throw Error("SDK unavailable"); };
    assert.doesNotThrow(() => analytics.identifyMerchantForAnalytics("merchant", "user"));
    assert.equal(sdk.capture, originalCapture);
  } finally { sdk.identify = originalIdentify; sdk.capture = originalCapture; }
});

test("serveur : absence, refus, expiration et contexte manquant ne déclenchent aucun envoi", async () => {
  browser();
  const consent = await import("./analytics-consent.ts");
  const { captureProductEvent } = await import("./product-analytics.ts");
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (...args) => { requests.push(args); return new Response(null, { status: 200 }); };
  try {
    const value = (choice, decidedAt = Date.now()) => encodeURIComponent(JSON.stringify({ version: consent.ANALYTICS_CONSENT_VERSION, choice, decidedAt }));
    for (const preference of [undefined, "malformed", value("rejected"), value("accepted", Date.now() - consent.ANALYTICS_CONSENT_MAX_AGE * 1000)]) {
      state.cookieValue = preference;
      await captureProductEvent("signup_completed", "merchant:user");
    }
    state.noRequest = true;
    await captureProductEvent("signup_completed", "merchant:user");
    assert.equal(requests.length, 0);
    state.noRequest = false;
    state.cookieValue = value("accepted");
    await captureProductEvent("signup_completed", "merchant:user", { merchantId: "merchant", email: "private" });
    assert.equal(requests.length, 1);
    const payload = JSON.parse(requests[0][1].body);
    assert.equal(payload.properties.email, undefined);
    assert.equal(payload.properties.consentVersion, consent.ANALYTICS_CONSENT_VERSION);
    assert.equal(payload.event, "signup_completed");
    globalThis.fetch = async () => { throw Error("unavailable"); };
    await assert.doesNotReject(captureProductEvent("signup_completed", "merchant:user"));
  } finally { globalThis.fetch = originalFetch; }
});
