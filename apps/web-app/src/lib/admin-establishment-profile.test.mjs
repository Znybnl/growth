import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

// Mock infrastructure only in this process: actual route, DAL and DTO run here.
const src = new URL("../", import.meta.url);
const adminEmail = "pierreh.brunelle@gmail.com";
let state;
const mocks = {
  "@/lib/auth": "export const getAuthenticatedSession = async () => globalThis.__profileTest.session;",
  "@/lib/supabase": "export const isSupabaseConfigured = () => true; export const getSupabaseAdmin = () => globalThis.__profileTest.db;",
  "@/lib/merchant-account-repository": "export const getSupabaseMerchantProfile = async id => {globalThis.__profileTest.reads.push(id); return globalThis.__profileTest.profiles[id] ?? null;}; export const getSupabaseMerchantWorkspaceContext = async (id, account) => ({locations:(globalThis.__profileTest.memberships[id] ?? [account.id]).map(id=>({merchant:globalThis.__profileTest.profiles[id]}))});",
  "@/lib/support-log": "export const logSupportEvent = (...args) => globalThis.__profileTest.logs.push(args);",
  "next/image": "import {createElement as h} from 'react'; export default ({unoptimized,...props}) => h('img',props);",
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) return {url:`data:text/javascript,${encodeURIComponent(mocks[specifier])}`,shortCircuit:true};
    if (specifier.startsWith("@/")) {
      const url = new URL(`${specifier.slice(2)}.ts`, src);
      return nextResolve(existsSync(url) ? url.href : new URL(`${specifier.slice(2)}.tsx`, src).href, context);
    }
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context.parentURL?.startsWith("data:") ? {...context,parentURL:import.meta.url} : context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) return {format:"module",source:ts.transpileModule(readFileSync(new URL(url),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};
    return nextLoad(url,context);
  },
});
const { GET } = await import("../app/api/admin/merchants/[merchantId]/profile/route.ts");
const { getAdminEstablishmentProfiles } = await import("./admin-establishment-repository.ts");
const { toAdminEstablishmentProfile, getSafeProfileUrl } = await import("./admin-establishment-profile.ts");
const { AdminEstablishmentProfileButton } = await import("../components/merchant/admin-establishment-profile-button.tsx");
const profile = (id) => ({id,companyName:`Commerce ${id}`,logoText:"Logo test",createdAt:"2026-10-01T12:00:00Z",locationStatus:"active"});

beforeEach(() => {
  state = globalThis.__profileTest = {
    session:{user:{email:adminEmail}},reads:[],logs:[],
    profiles:{root:profile("root"),site:profile("site"),foreign:profile("foreign"),archived:{...profile("archived"),locationStatus:"archived"}},
    memberships:{"root-user":["root","site","site","archived"]},
    users:[{id:"root-user",merchant_id:"root"},{id:"foreign-user",merchant_id:"foreign"}],preferences:[],preferenceReads:[],
  };
  state.db = {from(table) {
    assert.ok(["merchant_users","merchant_gain_notification_preferences"].includes(table));
    const filters = [];
    const result = () => {
      if (table === "merchant_gain_notification_preferences") state.preferenceReads.push(table);
      return {data:(table === "merchant_users" ? state.users : state.preferences).filter(row=>filters.every(f=>f(row))),
        error:state.dbError || (table === "merchant_gain_notification_preferences" && state.preferenceError) ? {message:"PRIVATE DATABASE DETAIL"} : null};
    };
    const q = {
      select() {return q;},eq(key,value) {filters.push(row=>row[key]===value);return q;},
      in(key,values) {filters.push(row=>values.includes(row[key]));return q;},
      order() {return q;},limit() {return q;},
      maybeSingle() {const r=result();return Promise.resolve({...r,data:r.data[0]??null});},
      then(resolve,reject) {return Promise.resolve(result()).then(resolve,reject);},
      update() {throw new Error("Read-only route must not write");},
      insert() {throw new Error("Read-only route must not write");},
    };
    return q;
  }};
});
const request = (userId="root-user") => new Request("https://app.example.test/api/admin/merchants/root/profile?adminEmail=" + adminEmail + "&locationId=foreign" + (userId === null ? "" : `&userId=${encodeURIComponent(userId)}`));
const params = (merchantId="root") => ({params:Promise.resolve({merchantId})});

test("401 sans session avant toute lecture", async () => {
  state.session = null;
  const response = await GET(request(),params());
  assert.equal(response.status,401);
  assert.deepEqual(state.reads,[]);
  assert.equal(response.headers.get("cache-control"),"private, no-store");
});
test("403 marchand, même avec un adminEmail usurpé dans la requête", async () => {
  state.session.user.email = "merchant@example.test";
  assert.equal((await GET(request(),params())).status,403);
  assert.deepEqual(state.reads,[]);
});
test("la DAL vérifie aussi l'administration avant lecture", async () => {
  await assert.rejects(getAdminEstablishmentProfiles("root","merchant@example.test","root-user"),/réservé/);
  assert.deepEqual(state.reads,[]);
});
test("multi-sites liés au compte, sans doublon ni établissement archivé/étranger", async () => {
  const response = await GET(request(),params());
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).locations.map(p=>p.id),["root","site"]);
  assert.equal(response.headers.get("vary"),"Cookie");
});
test("404 pour un compte absent ou archivé", async () => {
  assert.equal((await GET(request(),params("missing"))).status,404);
  assert.equal((await GET(request(),params("archived"))).status,404);
});
test("compte utilisateur requis et association au marchand vérifiée avant les préférences", async () => {
  assert.equal((await GET(request(null),params())).status,400);
  assert.equal((await GET(request("foreign-user"),params())).status,404);
  assert.deepEqual(state.preferenceReads,[]);
});
test("absence de préférence : notifications désactivées sans aucune écriture", async () => {
  const response=await GET(request(),params());
  assert.equal(response.status,200);
  for (const p of (await response.json()).locations) {
    assert.deepEqual(p.gainNotification,{frequencies:[],updatedAt:null});
  }
  assert.equal(state.preferenceReads.length,1);
  assert.deepEqual(state.preferences,[]);
});
test("sélections exactes, personnelles et distinctes par site, lecture groupée", async () => {
  for (const frequencies of [[],["instant"],["daily","weekly","monthly"]]) {
    state.preferences=[
      {user_id:"root-user",merchant_id:"root",enabled_frequencies:frequencies,updated_at:"2026-10-06T10:00:00Z"},
      {user_id:"foreign-user",merchant_id:"root",enabled_frequencies:["instant"],updated_at:"PRIVATE"},
      {user_id:"root-user",merchant_id:"foreign",enabled_frequencies:["weekly"],updated_at:"PRIVATE"},
    ];
    const response=await GET(request(),params());
    const payload=await response.json();
    assert.deepEqual(payload.locations[0].gainNotification,{frequencies,updatedAt:"2026-10-06T10:00:00Z"});
    assert.deepEqual(payload.locations[1].gainNotification,{frequencies:[],updatedAt:null});
    assert.ok(!JSON.stringify(payload).includes("PRIVATE"));
  }
  assert.equal(state.preferenceReads.length,3);
});
test("deux utilisateurs du même compte : aucun mélange de sites et préférences", async () => {
  state.users.push({id:"other-user",merchant_id:"root"});
  state.memberships["other-user"]=["root","foreign"];
  state.preferences=[{user_id:"other-user",merchant_id:"root",enabled_frequencies:["daily","monthly"],updated_at:"2026-10-06T10:00:00Z"}];
  const own=await (await GET(request(),params())).json();
  assert.deepEqual(own.locations.map(p=>p.id),["root","site"]);
  assert.deepEqual(own.locations[0].gainNotification.frequencies,[]);
  const other=await (await GET(request("other-user"),params())).json();
  assert.deepEqual(other.locations.map(p=>p.id),["root","foreign"]);
  assert.deepEqual(other.locations[0].gainNotification.frequencies,["daily","monthly"]);
});
test("erreur de lecture ou fréquence invalide : jamais de faux statut désactivé", async () => {
  state.preferenceError=true;
  assert.equal((await GET(request(),params())).status,503);
  state.preferenceError=false;
  state.preferences=[{user_id:"root-user",merchant_id:"root",enabled_frequencies:["INVALID"],updated_at:null}];
  assert.equal((await GET(request(),params())).status,503);
});
test("DTO explicite excluant même des secrets ajoutés au profil à l'exécution", async () => {
  Object.assign(state.profiles.root,{phone:"0123456789",restaurantEmail:"contact@example.test",instagramUrl:"https://instagram.com/example",googlePlaceRating:0,googlePlaceReviewCount:0,defaultPrizeCost:0,stripeCustomerId:"SECRET",stripeSubscriptionId:"SECRET",redemptionPin:"SECRET",redemptionPinHash:"SECRET",accessToken:"SECRET",private:{password:"SECRET"}});
  const response = await GET(request(),params());
  const raw = await response.text();
  assert.ok(!raw.includes("SECRET"));
  const p = JSON.parse(raw).locations[0];
  assert.equal(p.restaurantEmail,"contact@example.test");
  assert.equal(p.instagramUrl,"https://instagram.com/example");
  assert.equal(p.googlePlaceRating,0);
  assert.equal(p.googlePlaceReviewCount,0);
  assert.equal(p.defaultPrizeCost,0);
});
test("les valeurs absentes ne sont pas remplacées par des liens génériques", () => {
  const p = toAdminEstablishmentProfile(profile("empty"));
  assert.equal(p.googleReviewUrl,undefined);
  assert.equal(p.timeZone,undefined);
  assert.equal(p.logoUrl,undefined);
});
test("erreur de base : réponse et journal sans détail privé", async () => {
  state.dbError = true;
  const response = await GET(request(),params());
  assert.equal(response.status,503);
  assert.ok(!(await response.text()).includes("PRIVATE"));
  assert.ok(!JSON.stringify(state.logs).includes("PRIVATE"));
});
test("aucune URL dangereuse ou contenant des identifiants ne devient un lien", () => {
  for (const raw of ["javascript:alert(1)","data:text/html,test","ftp://example.test","https://user:password@example.test","/relative","google.com","",undefined]) {
    assert.equal(getSafeProfileUrl(raw),null);
  }
  assert.equal(getSafeProfileUrl(" https://example.test/path?q=1 "),"https://example.test/path?q=1");
  assert.equal(getSafeProfileUrl("http://example.test"),"http://example.test/");
});
test("le bouton n'embarque pas de profil ni ne précharge les données", () => {
  const html = renderToStaticMarkup(createElement(AdminEstablishmentProfileButton,{merchantId:"root",userId:"root-user"}));
  assert.ok(html.includes("Voir la fiche"));
  assert.ok(html.includes('aria-haspopup="dialog"'));
  assert.ok(!html.includes('role="dialog"'));
  assert.deepEqual(state.reads,[]);
});
test("Pilotage utilise le compte de la ligne sans ajouter un chargement global", () => {
  const source = readFileSync(new URL("../app/(merchant)/admin/page.tsx",import.meta.url),"utf8");
  assert.ok(source.includes("<AdminEstablishmentProfileButton merchantId={user.merchantId} userId={user.id} />"));
  assert.ok(!source.includes("getAdminEstablishmentProfiles("));
});
test("la fixture de recette est inaccessible en production", () => {
  const source = readFileSync(new URL("../app/dev/admin-location-profile-proof/page.tsx",import.meta.url),"utf8");
  assert.ok(source.includes('process.env.NODE_ENV !== "development"'));
  assert.ok(source.includes("notFound()"));
});
