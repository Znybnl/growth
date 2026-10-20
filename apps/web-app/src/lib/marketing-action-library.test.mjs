import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";

registerHooks({ resolve(name, context, next) {
  const mocks = {
    "@/lib/auth": "export const getAuthenticatedSession=async()=>globalThis.__links.session",
    "@/lib/admin": "export const isSaasAdminEmail=email=>email==='admin@example.test'",
    "@/lib/admin-campaign-repository": "export const getAdminCampaignLocation=async(account,site)=>account==='account-b'&&site==='site-b'?{id:site}:null",
    "@/lib/supabase": "export const getSupabaseAdmin=()=>globalThis.__links.db",
    "@/lib/support-log": "export const logSupportEvent=(...args)=>globalThis.__links.logs.push(args)",
    "next/cache": "export const revalidatePath=path=>globalThis.__links.revalidated.push(path)",
  };
  if (mocks[name]) return { url: "data:text/javascript," + encodeURIComponent(mocks[name]), shortCircuit: true };
  if (name.startsWith("@/")) return next(new URL("../" + name.slice(2) + ".ts", import.meta.url).href, context);
  return next(name, context);
}, load(url, context, next) {
  if (url.startsWith(new URL("../", import.meta.url).href) && /\.tsx?$/.test(url)) {
    return { format: "module", source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, shortCircuit: true };
  }
  return next(url, context);
} });
const library = await import("./marketing-action-library.ts");
const route = await import("../app/api/merchant/marketing-links/route.ts");
const admin = await import("../app/api/admin/merchants/[merchantId]/locations/[locationId]/marketing-links/route.ts");
const { assertCampaignCanPublish } = await import("./campaign-compliance.ts");
const { parseCampaignSetupInput } = await import("./merchant-input.ts");
const { getPrizeValidationMessages } = await import("./prize-validation.ts");
let state;
beforeEach(() => {
  state = globalThis.__links = {
    session: { user: { id: "user-a", email: "owner@example.test" }, locations: [{ merchant: { id: "site-a" } }, { merchant: { id: "archived", locationStatus: "archived" } }] },
    profile: { id: "site-a", logo_text: "Mon établissement", withdrawal_pin: "untouched", instagram_url: "", google_review_url: "https://g.page/r/old", appointment_url: "https://booking.example.test/unchanged" },
    campaigns: [{ id: "existing", actions: [{ url: "https://instagram.com/old" }] }],
    writes: [], logs: [], revalidated: [],
  };
  state.db = { from(table) {
    assert.equal(table, "merchants"); let fields, site;
    const q = {
      update(value) { fields = value; return q; },
      eq(key, value) { assert.equal(key, "id"); site = value; return q; },
      neq(key, value) { assert.equal(key, "location_status"); assert.equal(value, "archived"); return q; },
      select(value) { assert.equal(value, "id"); return q; },
      async maybeSingle() {
        if (state.fail) return { data: null, error: { message: "private-database-error" } };
        if (state.missing) return { data: null, error: null };
        state.writes.push({ site, fields }); Object.assign(state.profile, fields);
        return { data: { id: site }, error: null };
      },
    }; return q;
  } };
});
const request = (body, origin = "https://app.okado.app") => new Request("https://app.okado.app/api/merchant/marketing-links", {
  method: "PATCH", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const target = { params: Promise.resolve({ merchantId: "account-b", locationId: "site-b" }) };

test("catalogue : 7 services sans réservation, URL réutilisables et destinations sûres", () => {
  assert.equal(library.MARKETING_ACTION_CATALOG.length, 7);
  assert.throws(() => library.marketingActionEntry("appointment"), /inconnue/);
  for (const [key, input, expected] of [
    ["instagram", "@institut.test", "https://www.instagram.com/institut.test"],
    ["tiktok", "@institut", "https://www.tiktok.com/@institut"],
    ["google", "g.page/r/test", "https://g.page/r/test"],
    ["facebook", "https://facebook.com/test", "https://facebook.com/test"],
    ["tripadvisor", "https://www.tripadvisor.fr/Attraction-test", "https://www.tripadvisor.fr/Attraction-test"],
    ["website", "example.test", "https://example.test/"],
    ["custom", "https://example.test/path?a=b", "https://example.test/path?a=b"],
  ]) assert.equal(library.normalizeMarketingActionUrl(key, input), expected);
  for (const input of ["", "https://google.com", "http://g.page/r/test", "https://google.com.evil.test/maps", "javascript:alert(1)", "https://user:password@g.page/r/test", "https://g.page:444/r/test", "https://g.page/r/te st", "https://localhost", "https://127.0.0.1"]) {
    assert.throws(() => library.normalizeMarketingActionUrl("google", input), input);
  }
  assert.throws(() => library.normalizeMarketingActionUrl("instagram", "instagram.com"));
  assert.equal(library.configuredMarketingUrl({ googleReviewUrl: "https://google.com" }, "google"), "");
  assert.equal(library.marketingActionKey({ kind: "custom", label: "Prendre rendez-vous" }), "custom");
  assert.equal(library.marketingActionKey({ kind: "custom", label: "Visiter le site" }), "website");
  assert.equal(library.marketingActionKey({ kind: "custom", label: "CTA historique" }), "custom");
  assert.equal(library.marketingActionKey({ kind: "crm", label: "E-mail" }), null);
});

test("un seul champ Mon compte modifié ; ni logo, ni PIN, ni campagne réécrits", async () => {
  const before = structuredClone(state.campaigns);
  const response = await route.PATCH(request({ locationId: "site-a", key: "instagram", url: "@nouveau" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { key: "instagram", url: "https://www.instagram.com/nouveau" });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Cookie");
  assert.deepEqual(state.writes, [{ site: "site-a", fields: { instagram_url: "https://www.instagram.com/nouveau" } }]);
  assert.equal(state.profile.withdrawal_pin, "untouched");
  assert.equal(state.profile.logo_text, "Mon établissement");
  assert.equal(state.profile.google_review_url, "https://g.page/r/old");
  assert.equal(state.profile.appointment_url, "https://booking.example.test/unchanged");
  assert.deepEqual(state.campaigns, before);
  assert.deepEqual(state.revalidated, ["/account"]);
  assert.doesNotMatch(JSON.stringify(state.logs), /nouveau|owner@example|untouched/);
});

test("API : session, origine, établissement autorisé, archive, allowlist des champs", async () => {
  const valid = { locationId: "site-a", key: "instagram", url: "@test" };
  assert.equal((await route.PATCH(request(valid, "https://evil.test"))).status, 403);
  assert.equal((await route.PATCH(request({ ...valid, locationId: "site-b" }))).status, 403);
  assert.equal((await route.PATCH(request({ ...valid, locationId: "archived" }))).status, 403);
  for (const body of [{ ...valid, key: "appointment" }, { ...valid, key: "logoText" }, { ...valid, url: "https://evil.test/test" }, { ...valid, userId: "other" }, { ...valid, logo_text: "bad" }, { ...valid, locationId: null }, [], null]) {
    assert.equal((await route.PATCH(request(body))).status, 400);
  }
  state.session = null;
  assert.equal((await route.PATCH(request(valid))).status, 401);
  assert.deepEqual(state.writes, []);
});

test("les sept destinations utilisent exactement les champs existants de Mon compte", async () => {
  for (const [key, column, url] of [
    ["google", "google_review_url", "https://g.page/r/test"],
    ["instagram", "instagram_url", "https://instagram.com/test"],
    ["facebook", "facebook_url", "https://facebook.com/test"],
    ["tiktok", "tiktok_url", "https://tiktok.com/@test"],
    ["tripadvisor", "tripadvisor_url", "https://tripadvisor.fr/test"],
    ["website", "website_url", "https://example.test"],
    ["custom", "custom_link_url", "https://custom.example.test"],
  ]) {
    assert.equal((await route.PATCH(request({ locationId: "site-a", key, url }))).status, 200);
    assert.deepEqual(state.writes.at(-1), { site: "site-a", fields: { [column]: new URL(url).toString() } });
  }
});

test("assistance admin : rôle obligatoire et relation compte/établissement vérifiée", async () => {
  const body = { key: "website", url: "https://site-b.example.test" };
  assert.equal((await admin.PATCH(request(body), target)).status, 403);
  state.session.user.email = "admin@example.test";
  assert.equal((await admin.PATCH(request(body), { params: Promise.resolve({ merchantId: "wrong-account", locationId: "site-b" }) })).status, 403);
  assert.equal((await admin.PATCH(request({ ...body, locationId: "site-a" }), target)).status, 400);
  assert.equal((await admin.PATCH(request(body), target)).status, 200);
  assert.deepEqual(state.writes, [{ site: "site-b", fields: { website_url: "https://site-b.example.test/" } }]);
});

test("échec d’écriture ou établissement disparu : pas de faux succès, erreur sans détails privés", async () => {
  const body = { locationId: "site-a", key: "custom", url: "https://example.test" };
  state.fail = true;
  const response = await route.PATCH(request(body));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private-database-error/);
  state.fail = false; state.missing = true;
  assert.equal((await route.PATCH(request(body))).status, 503);
  assert.deepEqual(state.writes, []);
});

test("publication sans action autorisée ; autres contrôles et indépendance Google conservés", () => {
  const valid = { isActive: true, title: "Jeu", subtitle: "Une surprise vous attend", ctaLabel: "Jouer",
    actions: [], prizes: [{ probability: 100, totalQuantity: null }], rewardRules: { isWinningEveryTime: true },
    presentation: { email: { subject: "Votre gain", body: "Bonjour" } } };
  assert.doesNotThrow(() => assertCampaignCanPublish(valid));
  assert.throws(() => assertCampaignCanPublish({ ...valid, prizes: [] }), /lot/);
  assert.throws(() => assertCampaignCanPublish({ ...valid, actions: [{ kind: "instagram", label: "Instagram", url: "http://instagram.com/test" }] }), /HTTPS/);
  assert.throws(() => assertCampaignCanPublish({ ...valid, actions: [{ kind: "google", label: "Google", url: "https://google.com" }] }), /fiche/);
  assert.throws(() => assertCampaignCanPublish({ ...valid, subtitle: "Laissez un avis pour gagner un cadeau", actions: [{ kind: "google", label: "Google", url: "https://g.page/r/test" }] }), /conditionner/);
});

test("SFD lots : publication interdite à 0 % sur les deux validations serveur, brouillon incomplet autorisé", () => {
  const valid = { isActive: true, title: "Jeu de test", subtitle: "Une surprise vous attend", ctaLabel: "Jouer",
    actions: [], prizes: [{ label: "Lot test", probability: 0, totalQuantity: null }], rewardRules: { isWinningEveryTime: false },
    accent: {}, presentation: { logo: {}, background: {}, heading: {}, button: {}, layout: {}, wheel: {}, poster: { wheel: {} }, email: { subject: "Votre gain", body: "Bonjour" } } };
  assert.throws(() => assertCampaignCanPublish(valid), /supérieure à 0/);
  assert.throws(() => parseCampaignSetupInput(valid, "site-a"), /supérieure à 0/);
  assert.ok(getPrizeValidationMessages(valid.prizes, false).some((message) => /supérieure à 0/.test(message)));
  assert.doesNotThrow(() => assertCampaignCanPublish({ ...valid, isActive: false }));
  assert.doesNotThrow(() => parseCampaignSetupInput({ ...valid, isActive: false }, "site-a"));
  assert.doesNotThrow(() => assertCampaignCanPublish({ ...valid, prizes: [{ ...valid.prizes[0], probability: 0.25 }] }));
  assert.doesNotThrow(() => parseCampaignSetupInput({ ...valid, prizes: [{ ...valid.prizes[0], probability: 0.25 }] }, "site-a"));
});
