import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { test } from "node:test";

// No SDK requests, real cookies, Supabase writes or production credentials.
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_consent_fixture";
delete process.env.NEXT_PUBLIC_POSTHOG_ENABLED;
const root = new URL("../../../../", import.meta.url);
// Test-only import: the editorial body stays outside both client bundles.
const { blogPosts } = await import(new URL("apps/landing-page/src/lib/blog.ts", root));
let state;
registerHooks({
  resolve(name, context, next) {
    if (name === "next/headers") return {
      url: "data:text/javascript,export const cookies=async()=>{if(globalThis.__consentFixture.noRequest)throw Error('No request');return {get:()=>({value:globalThis.__consentFixture.cookieValue})}}",
      shortCircuit: true,
    };
    if (name === "posthog-js") return {
      url: "data:text/javascript,export default {init:(key,config)=>{globalThis.__consentFixture.init.push({key,config})},opt_out_capturing:()=>globalThis.__consentFixture.calls.push('out'),opt_in_capturing:()=>globalThis.__consentFixture.calls.push('in'),set_config:config=>globalThis.__consentFixture.calls.push(config),reset:()=>{globalThis.__consentFixture.calls.push('reset');globalThis.__consentFixture.distinctId='fresh-anonymous';globalThis.__consentFixture.properties={}},get_distinct_id:()=>globalThis.__consentFixture.distinctId||'anonymous-fixture',get_property:key=>globalThis.__consentFixture.properties[key],register:props=>Object.assign(globalThis.__consentFixture.properties,props),capture:(...args)=>globalThis.__consentFixture.events.push(args),identify:(...args)=>{globalThis.__consentFixture.identities.push(args);globalThis.__consentFixture.distinctId=args[0];globalThis.__consentFixture.properties.$user_id=args[0]},captureLog:log=>globalThis.__consentFixture.logs.push(log)}",
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
  state = globalThis.__consentFixture = { init: [], calls: [], events: [], identities: [], logs: [], properties: {} };
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

test("les deux applications partagent le protocole et conservent les mêmes gardes de consentement", () => {
  assert.equal(
    readFileSync(new URL("apps/web-app/src/lib/analytics-consent.ts", root), "utf8"),
    readFileSync(new URL("apps/landing-page/src/lib/analytics-consent.ts", root), "utf8"),
    "lib/analytics-consent.ts",
  );

  for (const app of ["web-app", "landing-page"]) {
    const source = readFileSync(new URL(`apps/${app}/src/components/privacy/cookie-preferences.tsx`, root), "utf8");
    assert.match(source, /if \(!isAnalyticsConfigured\) return null/);
    assert.match(source, /currentChoice === "accepted"/);
    assert.match(source, /setAnalyticsChoice\(choice\)/);
    assert.match(source, /isPublicGamePage\(pathname\)/);
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
    // The landing page loads its SDK asynchronously only after consent.
    await new Promise((resolve) => setImmediate(resolve));
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
    const profile = config.before_send({ event: "$identify", $set: { email: "account@example.test", name: "private", token: "private" },
      $set_once: { email: "never@example.test" }, properties: { distinct_id: "account:user", accountMerchantId: "account", merchantUserId: "user",
        email: "ordinary-event@example.test", $set: { email: "account@example.test", address: "private" } } });
    assert.deepEqual(profile.$set, { email: "account@example.test" });
    assert.deepEqual(profile.properties.$set, { email: "account@example.test" });
    assert.equal(profile.$set_once, undefined);
    assert.equal(profile.properties.email, undefined);
    for (const event of [
      { event: "campaign_created", $set: { email: "private@example.test" }, properties: { distinct_id: "account:user", accountMerchantId: "account", merchantUserId: "user" } },
      { event: "$identify", $set: { email: "private@example.test" }, properties: { distinct_id: "other:user", accountMerchantId: "account", merchantUserId: "user" } },
      { event: "$set", $set: { email: "not-an-email" }, properties: { distinct_id: "account:user", accountMerchantId: "account", merchantUserId: "user" } },
    ]) assert.equal(config.before_send(event).$set, undefined);
    assert.equal(sanitized.properties.page, "/inscription");
    for (const path of ["/", "/restaurants", "/instituts-beaute", "/tarifs", "/onboarding", "/guides/lots-restaurant"]) {
      assert.equal(client.safeAnalyticsPage(path), path);
    }
    const publicBlogPages = ["/blog", ...blogPosts.map((post) => post.path)];
    assert.equal(new Set(publicBlogPages).size, publicBlogPages.length);
    for (const path of publicBlogPages) {
      assert.equal(client.safeAnalyticsPage(path), path, "new articles must be explicitly allowed in both apps");
      window.location.pathname = path;
      window.location.search = "?email=private%40example.test&token=secret&utm_source=fixture";
      const packet = config.before_send({ event: "$pageview", properties: { page: "/untrusted-input" } });
      assert.equal(packet.properties.page, path);
      assert.equal(packet.properties.utmSource, "fixture");
      assert.doesNotMatch(JSON.stringify(packet), /private@|token=|untrusted-input/);
    }
    for (const path of ["/campaign/private-id", "/redeem/secret", "/auth/callback", "/api/private", "/guides/person@example.test",
      "/blog/unknown-article", "/blog/person@example.test", "/blog/123456",
      publicBlogPages[1] + "/private-id", publicBlogPages[1] + "?email=private",
      "/blog/%61ttirer-clients-fleuriste", "/blog//attirer-clients-fleuriste"]) {
      const expected = app === "web-app" && path === "/campaign/private-id" ? "/campaign/[id]"
        : app === "web-app" && path === "/redeem/secret" ? "/redeem/[code]" : "/other";
      assert.equal(client.safeAnalyticsPage(path), expected);
      window.location.pathname = path;
      assert.equal(config.before_send({ event: "$pageview", properties: {} }).properties.page, expected);
    }
    window.location.pathname = "/inscription";
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
    assert.equal(restricted.page, app === "web-app" ? "/redeem/[code]" : "/other");
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
      await new Promise((resolve) => setImmediate(resolve));
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
    await new Promise((resolve) => setImmediate(resolve));
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
    sdk.capture = () => { throw Error("SDK unavailable"); };
    assert.equal(analytics.captureClientProductEvent("campaign_saved"), false);
    sdk.capture = originalCapture;
  } finally { sdk.identify = originalIdentify; sdk.capture = originalCapture; }
});

test("uploads : début/confirmation/échec réels, aucun nom de fichier, URL ou message libre", async () => {
  browser();
  const consent = await import("./analytics-consent.ts");
  consent.saveAnalyticsConsent("accepted");
  const { uploadMerchantImageFile } = await import("./client-merchant-image-upload.ts");
  const previousFetch = globalThis.fetch;
  try {
    const file = new File(["image-fixture"], "private@example.test.png", { type: "image/png" });
    globalThis.fetch = async () => Response.json({ image: { url: "https://example.test/private-logo", bytes: 120, width: 20, height: 10 } });
    const image = await uploadMerchantImageFile(file, "logo");
    assert.equal(image.bytes, 120);
    assert.deepEqual(state.events.map(event => event[0]), ["merchant_image_upload_started", "merchant_image_upload_completed"]);
    assert.equal(state.events[1][1].outputBytes, 120);
    globalThis.fetch = async () => Response.json({ error: "private@example.test failure" }, { status: 500 });
    await assert.rejects(() => uploadMerchantImageFile(file, "background"));
    assert.equal(state.events.at(-1)[0], "merchant_image_upload_failed");
    assert.doesNotMatch(JSON.stringify(state.events), /private|https:|\.png|failure/);
    consent.saveAnalyticsConsent("rejected");
    const count = state.events.length;
    globalThis.fetch = async () => Response.json({ image: { url: "https://example.test/image", bytes: 120, width: 20, height: 10 } });
    await uploadMerchantImageFile(file, "logo");
    assert.equal(state.events.length, count, "refusal does not break the upload and emits nothing");
  } finally { globalThis.fetch = previousFetch; }
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

test("identité : même utilisateur sur plusieurs établissements, réparation au retour et contexte du site", async () => {
  const jar = browser();
  const consent = await import("./analytics-consent.ts");
  jar.set(consent.ANALYTICS_CONSENT_COOKIE, encodeURIComponent(JSON.stringify({ version: consent.ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })));
  const analytics = await import("./client-product-analytics.ts");
  const { merchantDistinctId } = await import("./product-analytics.ts");
  for (const location of ["merchant-primary", "merchant-secondary", "merchant-third"]) {
    analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", location);
    assert.equal(state.distinctId, merchantDistinctId("merchant-primary", "user-fixture"));
    assert.equal(state.properties.merchantId, location);
    assert.equal(state.properties.accountMerchantId, "merchant-primary");
    assert.equal(state.properties.merchantUserId, "user-fixture");
  }
  assert.equal(new Set(state.identities.map(([id]) => id)).size, 1);
  assert.equal(state.calls.filter((call) => call === "reset").length, 0, "le changement de site ne recrée pas de session");
  state.distinctId = "anonymous-after-cookie-reset";
  state.properties = {};
  analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-third");
  assert.equal(state.distinctId, "merchant-primary:user-fixture", "retour de focus/route : identité rétablie");
  assert.equal(state.calls.filter((call) => call === "reset").length, 0, "l'anonyme reste rapprochable");
});

test("identité : ancien site ou autre compte identifiés sont réinitialisés sans fusion implicite", async () => {
  const jar = browser();
  const consent = await import("./analytics-consent.ts");
  jar.set(consent.ANALYTICS_CONSENT_COOKIE, encodeURIComponent(JSON.stringify({ version: consent.ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })));
  const analytics = await import("./client-product-analytics.ts");
  for (const previous of ["merchant-secondary:user-fixture", "merchant-other:user-other", "historical-identified-id"]) {
    state.distinctId = previous;
    state.properties.$user_id = previous;
    const resets = state.calls.filter((call) => call === "reset").length;
    analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-secondary");
    assert.equal(state.calls.filter((call) => call === "reset").length, resets + 1);
    assert.equal(state.distinctId, "merchant-primary:user-fixture");
  }
  analytics.resetProductAnalytics();
  assert.equal(state.distinctId, "fresh-anonymous");
  assert.equal(state.properties.merchantUserId, undefined);
  analytics.identifyMerchantForAnalytics("merchant-other", "user-other");
  assert.equal(state.distinctId, "merchant-other:user-other");
  assert.equal(state.identities.every((identity) => identity.length === 1), true, "pas d'e-mail ni de texte libre dans identify");
});

test("vrai handler QR : identité du compte principal, contexte du site actif et contrôle de propriété conservés", async () => {
  const { merchantDistinctId } = await import("./product-analytics.ts");
  const calls = [];
  let campaignMerchantId = "merchant-secondary";
  const dependencies = {
    "next/server": { NextResponse: Response },
    "@/lib/auth": { requireAuthenticatedSession: async () => ({
      user: { id: "user-fixture", merchantId: "merchant-primary" }, merchant: { id: "merchant-secondary" },
    }) },
    "@/lib/campaign-exports": { createCampaignQrSvg: async () => '<svg xmlns="http://www.w3.org/2000/svg" />' },
    "@/lib/preview-token": { issuePreviewAccessToken: () => { throw Error("Not a preview"); } },
    "@/lib/product-analytics": { merchantDistinctId, captureProductEvent: async (...args) => calls.push(args) },
    "@/lib/store": { getCampaignPerformance: async () => ({ campaign: { id: "campaign-fixture", merchantId: campaignMerchantId, createdAt: "2026-10-01T00:00:00Z" } }) },
  };
  const testModule = { exports: {} };
  const source = readFileSync(new URL("../app/api/campaigns/[id]/qr/route.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: testModule, exports: testModule.exports, URL, Date, Math, require: (name) => {
      if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    } });
  const context = { params: Promise.resolve({ id: "campaign-fixture" }) };
  const response = await testModule.exports.GET(new Request("https://example.test/api/campaigns/campaign-fixture/qr"), context);
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "campaign_qr_downloaded");
  assert.equal(calls[0][1], "merchant-primary:user-fixture");
  assert.equal(calls[0][2].merchantId, "merchant-secondary");
  assert.equal(calls[0][2].merchantUserId, "user-fixture");
  campaignMerchantId = "merchant-foreign";
  assert.equal((await testModule.exports.GET(new Request("https://example.test/api/campaigns/campaign-fixture/qr"), context)).status, 404);
  assert.equal(calls.length, 1);
});

test("e-mail du profil : compte connecté, déduplication et changement d'adresse sans changer d'identité", async () => {
  const jar = browser();
  const consent = await import("./analytics-consent.ts");
  const analytics = await import("./client-product-analytics.ts");
  analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-secondary", "account@example.test");
  assert.equal(state.identities.length, 0, "aucun profil avant accord");
  jar.set(consent.ANALYTICS_CONSENT_COOKIE, encodeURIComponent(JSON.stringify({ version: consent.ANALYTICS_CONSENT_VERSION, choice: "accepted", decidedAt: Date.now() })));
  analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-secondary", " Account@Example.test ");
  assert.deepEqual(state.identities.at(-1), ["merchant-primary:user-fixture", { email: "account@example.test" }]);
  analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-third", "account@example.test");
  assert.deepEqual(state.identities.at(-1), ["merchant-primary:user-fixture"]);
  analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-third", "updated@example.test");
  assert.deepEqual(state.identities.at(-1), ["merchant-primary:user-fixture", { email: "updated@example.test" }]);
  assert.equal(state.calls.includes("reset"), false);
  jar.clear();
  analytics.identifyMerchantForAnalytics("merchant-primary", "user-fixture", "merchant-third", "refused@example.test");
  assert.equal(state.identities.length, 3);
});

test("clics jeu et action marketing : événements minimisés et soumis au consentement analytics", async () => {
  const jar = browser();
  const consent = await import("./analytics-consent.ts");
  const analytics = await import("./client-product-analytics.ts");
  const properties = { campaignId: "campaign-fixture", gameType: "wheel" };

  analytics.captureClientProductEvent("marketing_action_clicked", {
    ...properties,
    actionKind: "google",
  });
  analytics.captureClientProductEvent("game_start_clicked", properties);
  assert.equal(state.events.length, 0, "aucun clic n'est transmis sans consentement");

  jar.set(consent.ANALYTICS_CONSENT_COOKIE, encodeURIComponent(JSON.stringify({
    version: consent.ANALYTICS_CONSENT_VERSION,
    choice: "accepted",
    decidedAt: Date.now(),
  })));
  analytics.captureClientProductEvent("marketing_action_clicked", {
    ...properties,
    actionKind: "google",
  });
  analytics.captureClientProductEvent("game_start_clicked", properties);

  assert.deepEqual(state.events.map(([event]) => event), [
    "marketing_action_clicked",
    "game_start_clicked",
  ]);
  assert.deepEqual(state.events[0][1], {
    ...properties,
    actionKind: "google",
    source: "client",
    trackingVersion: "v1",
    environment: "local",
  });
  assert.deepEqual(state.events[1][1], {
    ...properties,
    source: "client",
    trackingVersion: "v1",
    environment: "local",
  });
  assert.doesNotMatch(JSON.stringify(state.events), /email|actionUrl|actionLabel|sessionId/);
});
