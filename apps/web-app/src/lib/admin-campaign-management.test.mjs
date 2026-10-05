import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

// These hooks exist only in this test process. No application auth bypass, database
// connection, real merchant write, image upload or email is used by this suite.
const src = new URL("../", import.meta.url);
const adminEmail = "pierreh.brunelle@gmail.com";
let state;
const mocks = {
  "@/lib/auth": "export const getAuthenticatedSession = async () => globalThis.__adminCampaignTest.session; export const requireAuthenticatedSession = async () => { const s = globalThis.__adminCampaignTest.session; if (!s) throw new Error('redirect:/connexion'); return s; };",
  "@/lib/supabase": "export const isSupabaseConfigured = () => true; export const getSupabaseAdmin = () => globalThis.__adminCampaignTest.db;",
  "@/lib/merchant-account-repository": "export const getSupabaseMerchantProfile = async id => globalThis.__adminCampaignTest.profiles[id] ?? null; export const getSupabaseMerchantWorkspaceContext = async (_id, account) => ({locations: (globalThis.__adminCampaignTest.associated[account.id] ?? [account.id]).map(id => ({merchant:globalThis.__adminCampaignTest.profiles[id]}))});",
  "@/lib/store": "export const saveCampaignSetup = async input => {globalThis.__adminCampaignTest.saves.push(input); return input.id ?? 'new-game';}; export const updateCampaignPosterSettings = async (...args) => globalThis.__adminCampaignTest.posters.push(args); export const getCampaignSetupPerformance = async (id, merchant) => {globalThis.__adminCampaignTest.performanceMerchant = merchant; return {campaign:{id,merchantId:globalThis.__adminCampaignTest.wrongPerformance ? 'other' : merchant.id,presentation:{background:{},poster:{}}},prizes:[]};}; export const getCampaignPerformance = getCampaignSetupPerformance;",
  "@/lib/merchant-input": "export const parseCampaignSetupInput = input => ({...input,presentation:input.presentation ?? {background:{},poster:{}}});",
  "@/lib/merchant-image-processing": "export class MerchantImageValidationError extends Error {} export const optimizeMerchantImage = async () => {throw new Error('Unexpected image processing');};",
  "@/lib/merchant-image-storage": "export const getCampaignMerchantImageUrls = async () => []; export const deleteMerchantImagesIfUnreferenced = async () => {}; export const uploadMerchantImage = async () => {throw new Error('Unexpected storage write');}; export const getMerchantPosterLogoDataUrl = async (_url, id) => 'logo-for:' + id;",
  "@/lib/support-log": "export const logSupportEvent = (...args) => globalThis.__adminCampaignTest.logs.push(args);",
  "@/lib/campaign-exports": "export const createCampaignQrSvg = async url => {globalThis.__adminCampaignTest.qrUrls.push(url); return '<svg></svg>';};",
  "@/lib/format": "export const formatDateTime = value => value;",
  "@/components/ui/workspace": "import {createElement as h} from 'react'; export const PageHeader = ({title,description,actions}) => h('header',null,h('h1',null,title),h('p',null,description),actions); export const ResponsiveTable = ({children}) => h('div',null,children);",
  "@/components/merchant/campaign-wizard": "import {createElement as h} from 'react'; export const CampaignWizard = props => {globalThis.__adminCampaignTest.wizardProps = props; return h('div',null,'Wizard');};",
  "@/components/merchant/poster-editor": "import {createElement as h} from 'react'; export const PosterEditor = props => {globalThis.__adminCampaignTest.posterProps = props; return h('div',null,'Affiche');};",
  "next/link": "import {createElement as h} from 'react'; export default function Link({href,children,...props}) {return h('a',{href,...props},children);}",
  "next/navigation": "export const redirect = path => {throw new Error('redirect:' + path);}; export const notFound = () => {throw new Error('not-found');};",
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (mocks[specifier]) return {url:`data:text/javascript,${encodeURIComponent(mocks[specifier])}`,shortCircuit:true};
    if (specifier.startsWith("@/")) return nextResolve(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context.parentURL?.startsWith("data:") ? {...context,parentURL:import.meta.url} : context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) return {format:"module",source:ts.transpileModule(readFileSync(new URL(url),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText,shortCircuit:true};
    return nextLoad(url, context);
  },
});

const {getAdminCampaignContext, getAdminCampaigns} = await import("./admin-campaign-repository.ts");
const setup = await import("../app/api/admin/merchants/[merchantId]/locations/[locationId]/campaigns/setup/route.ts");
const poster = await import("../app/api/admin/campaigns/[id]/poster-settings/route.ts");
const assets = await import("../app/api/admin/campaigns/[id]/assets/route.ts");
const logo = await import("../app/api/admin/campaigns/[id]/poster-logo/route.ts");
const preview = await import("../app/api/admin/campaigns/[id]/preview/route.ts");
const {verifyPreviewAccessToken} = await import("./preview-token.ts");
const listPage = (await import("../app/(merchant)/admin/campaigns/page.tsx")).default;
const editPage = (await import("../app/(merchant)/admin/campaigns/[id]/edit/page.tsx")).default;
const posterPage = (await import("../app/(merchant)/admin/campaigns/[id]/poster/page.tsx")).default;
const {uploadMerchantImageFile} = await import("./merchant-image-upload.ts");

function fakeDb() {
  return {from(table) {
    state.reads.push(table);
    const filters = [];
    let range;
    let single = false;
    const q = {
      select(fields) { state.projections.push(fields); return q; },
      eq(key,value) {filters.push(row => row[key] === value); return q;},
      in(key,values) {filters.push(row => values.includes(row[key])); return q;},
      order() {return q;}, limit() {return q;},
      ilike(_key,value) {state.pattern = value; return q;},
      range(start,end) {range = [start,end]; state.range = range; return q;},
      maybeSingle() {single = true; return q;},
      then(resolve,reject) {
        const rows = table === "campaigns" ? state.campaigns
          : table === "merchant_users" ? [{id:"user-root",merchant_id:"root"}]
          : Object.values(state.profiles).map(p => ({id:p.id,company_name:p.companyName}));
        let data = rows.filter(row => filters.every(filter => filter(row)));
        if (range) data = data.slice(range[0],range[1]+1);
        return Promise.resolve({data:single ? data[0] ?? null : data,error:state.errorTable === table ? {message:"test error"} : null}).then(resolve,reject);
      },
    };
    return q;
  }};
}
beforeEach(() => {
  state = globalThis.__adminCampaignTest = {
    session:{user:{id:"admin-user",email:adminEmail},merchant:{id:"admin-own-location"}},
    profiles:{root:{id:"root",companyName:"Marchand pilote"},site:{id:"site",companyName:"Établissement pilote",logoText:"Logo marchand"},other:{id:"other",companyName:"Autre marchand"}},
    associated:{root:["root","site"],site:["site"],other:["other"]},
    campaigns:[{id:"existing",merchant_id:"site",title:"Jeu existant",is_active:true,created_at:"2026-10-01",campaign_local_settings:{}},{id:"foreign",merchant_id:"other",title:"Autre jeu",is_active:false,created_at:"2026-09-01"}],
    reads:[],projections:[],saves:[],posters:[],logs:[],qrUrls:[],
  };
  state.db = fakeDb();
});
const params = {params:Promise.resolve({id:"existing"})};
function setupRequest(body = {id:"existing",merchantId:"site",isActive:true}, origin = "http://localhost:3001") {
  return new Request("http://localhost:3001/api/admin/merchants/root/locations/site/campaigns/setup",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});
}
const setupParams = {params:Promise.resolve({merchantId:"root",locationId:"site"})};

test("la DAL refuse un non-admin avant toute lecture service_role", async () => {
  await assert.rejects(getAdminCampaignContext("existing","merchant@example.test"),/réservé/);
  await assert.rejects(getAdminCampaigns("merchant@example.test"),/réservé/);
  assert.deepEqual(state.reads,[]);
});
test("ouvre un jeu marchand sans audit admin et conserve son vrai site/profil", async () => {
  const context = await getAdminCampaignContext("existing",adminEmail,"root");
  assert.equal(context.accountMerchantId,"root");
  assert.equal(context.targetLocationId,"site");
  assert.equal(context.location.logoText,"Logo marchand");
});
test("un ancien créateur admin différent ne bloque plus l’assistance", async () => {
  state.campaigns[0].campaign_local_settings.adminCreation = {adminUserId:"old-admin"};
  assert.equal((await getAdminCampaignContext("existing",adminEmail)).targetLocationId,"site");
});
test("refuse un jeu d’un autre compte et un identifiant inconnu", async () => {
  assert.equal(await getAdminCampaignContext("foreign",adminEmail,"root"),null);
  assert.equal(await getAdminCampaignContext("missing",adminEmail),null);
});
test("liste les jeux du compte et ses sites, pas ceux d’un autre marchand", async () => {
  const result = await getAdminCampaigns(adminEmail,{accountMerchantId:"root"});
  assert.deepEqual(result.campaigns.map(c => c.id),["existing"]);
  assert.equal(result.campaigns[0].merchantName,"Établissement pilote");
  assert.ok(state.projections.every(p => !p.includes("campaign_local_settings")));
});
test("pagination au-delà du précédent plafond de 500 jeux", async () => {
  state.campaigns = Array.from({length:560},(_,i) => ({...state.campaigns[0],id:`game-${i}`}));
  const result = await getAdminCampaigns(adminEmail,{page:11});
  assert.equal(result.campaigns.length,50);
  assert.equal(result.campaigns[0].id,"game-500");
  assert.equal(result.hasNextPage,true);
  assert.deepEqual(state.range,[500,550]);
});
test("pagination invalide et caractères joker de recherche maîtrisés", async () => {
  const result = await getAdminCampaigns(adminEmail,{page:NaN,query:"100%_"});
  assert.equal(result.page,1);
  assert.equal(state.pattern,"%100\\%\\_%");
});
test("une erreur de base ne se transforme pas en liste vide", async () => {
  state.errorTable = "campaigns";
  await assert.rejects(getAdminCampaigns(adminEmail),/Lecture/);
});
test("tous les endpoints admin refusent 401/403 sans accès à la base", async () => {
  for (const session of [null,{user:{id:"merchant",email:"merchant@example.test"}}]) {
    state.session = session;
    const expected = session ? 403 : 401;
    assert.equal((await setup.POST(setupRequest(),setupParams)).status,expected);
    assert.equal((await poster.POST(setupRequest(),params)).status,expected);
    assert.equal((await assets.GET(new Request("http://localhost:3001"),params)).status,expected);
    assert.equal((await logo.GET(new Request("http://localhost:3001?url=x"),params)).status,expected);
    assert.equal((await preview.GET(new Request("http://localhost:3001"),params)).status,expected);
  }
  assert.deepEqual(state.reads,[]);
  assert.deepEqual(state.saves,[]);
});
test("enregistre le jeu existant sans création/publication ni réécriture de l’audit", async () => {
  const response = await setup.POST(setupRequest(),setupParams);
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{campaign:{id:"existing"}});
  assert.equal(state.saves[0].merchantId,"site");
  assert.equal(state.saves[0].isActive,true);
  assert.equal(state.saves[0].adminCreationAudit,undefined);
  assert.equal(state.logs[0][1],"admin_campaign_updated");
  assert.equal(state.logs[0][2].adminUserId,"admin-user");
});
test("la nouvelle création admin reste un brouillon avec son audit", async () => {
  assert.equal((await setup.POST(setupRequest({merchantId:"site",isActive:true}),setupParams)).status,201);
  assert.equal(state.saves[0].isActive,false);
  assert.deepEqual(state.saves[0].adminCreationAudit,{adminUserId:"admin-user",accountMerchantId:"root"});
});
test("rejette les substitutions de jeu, de site et les mutations cross-origin", async () => {
  assert.equal((await setup.POST(setupRequest({id:"foreign",merchantId:"site"}),setupParams)).status,404);
  assert.equal((await setup.POST(setupRequest({id:"existing",merchantId:"other"}),setupParams)).status,403);
  assert.equal((await setup.POST(setupRequest(undefined,"https://untrusted.example"),setupParams)).status,403);
  assert.deepEqual(state.saves,[]);
});
test("l’affiche et son logo sont traités dans le contexte de l’établissement", async () => {
  const request = setupRequest({poster:{logoText:"Logo modifié"},wheelSubtitle:"Texte"});
  assert.equal((await poster.POST(request,params)).status,200);
  assert.deepEqual(state.posters[0],["existing",{logoText:"Logo modifié"},"site","Texte"]);
  assert.equal(state.logs[0][1],"admin_campaign_poster_updated");
  const response = await logo.GET(new Request("http://localhost:3001?url=image"),params);
  assert.deepEqual(await response.json(),{dataUrl:"logo-for:site"});
});
test("prévisualisation mobile/iframe avec jeton valide, borné au jeu et non caché", async () => {
  for (const embed of [false,true]) {
    const response = await preview.GET(new Request(`http://localhost:3001/api/admin/campaigns/existing/preview${embed ? "?embed=1" : ""}`),params);
    assert.equal(response.status,307);
    assert.match(response.headers.get("cache-control"),/no-store/);
    const url = new URL(response.headers.get("location"));
    assert.equal(url.pathname,`/campaign/existing${embed ? "/preview-embed" : ""}`);
    assert.equal(url.searchParams.get("preview"),"1");
    assert.ok(verifyPreviewAccessToken(url.searchParams.get("previewToken"),"existing"));
    assert.equal(verifyPreviewAccessToken(url.searchParams.get("previewToken"),"foreign"),null);
  }
  assert.deepEqual(state.saves,[]);
});
test("QR admin réservé au test et jeu inconnu refusé", async () => {
  const response = await preview.GET(new Request("http://localhost:3001/api/admin/campaigns/existing/preview?format=qr"),params);
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type"),/image\/svg/);
  assert.equal(new URL(state.qrUrls[0]).searchParams.get("preview"),"1");
  assert.equal((await preview.GET(new Request("http://localhost:3001"),{params:Promise.resolve({id:"missing"})})).status,404);
});
test("rendu de la liste : compte cible, liens de modification et filtre conservé", async () => {
  state.campaigns = Array.from({length:52},(_,i) => ({...state.campaigns[0],id:`game-${i}`}));
  const html = renderToStaticMarkup(await listPage({searchParams:Promise.resolve({merchantId:"root",q:"Jeu"})}));
  assert.match(html,/Jeux de Marchand pilote/);
  assert.match(html,/Modifier le jeu/);
  assert.match(html,/admin\/campaigns\/game-0\/edit/);
  assert.match(html,/admin\/campaigns\/game-0\/poster/);
  assert.match(html,/name="merchantId" value="root"/);
  assert.match(html,/page=2&amp;q=Jeu&amp;merchantId=root/);
});
test("la liste refuse un marchand ou visiteur et un compte inconnu", async () => {
  state.session = null;
  await assert.rejects(listPage({searchParams:Promise.resolve({})}),/connexion/);
  state.session = {user:{email:"merchant@example.test"}};
  await assert.rejects(listPage({searchParams:Promise.resolve({})}),/redirect:\//);
  assert.deepEqual(state.reads,[]);
  state.session = {user:{email:adminEmail}};
  await assert.rejects(listPage({searchParams:Promise.resolve({merchantId:"unknown"})}),/not-found/);
});
test("pages de configuration/affiche : profil réel, endpoints admin et import au bon site", async () => {
  renderToStaticMarkup(await editPage(params));
  assert.equal(state.performanceMerchant.id,"site");
  assert.equal(state.wizardProps.merchant.logoText,"Logo marchand");
  assert.equal(state.wizardProps.initialCampaign.campaign.id,"existing");
  assert.equal(state.wizardProps.adminSaveEndpoint,"/api/admin/merchants/site/locations/site/campaigns/setup");
  assert.equal(state.wizardProps.adminAssetsEndpoint,"/api/admin/campaigns/existing/assets");
  renderToStaticMarkup(await posterPage(params));
  assert.equal(state.posterProps.settingsEndpoint,"/api/admin/campaigns/existing/poster-settings");
  assert.deepEqual(state.posterProps.adminImageTarget,{accountMerchantId:"site",locationId:"site"});
});
test("pages de configuration/affiche : non-admin et mauvais rattachement refusés", async () => {
  state.session = {user:{email:"merchant@example.test"}};
  for (const page of [editPage,posterPage]) await assert.rejects(page(params),/redirect:\//);
  assert.deepEqual(state.reads,[]);
  state.session = {user:{email:adminEmail}};
  state.wrongPerformance = true;
  for (const page of [editPage,posterPage]) await assert.rejects(page(params),/not-found/);
});
test("upload client : le logo admin transporte le compte et site ; marchand inchangé", async () => {
  const originalFetch = globalThis.fetch;
  const payloads = [];
  globalThis.fetch = async (_url, options) => {
    payloads.push(options.body);
    return Response.json({image:{url:"https://example.test/optimized.webp"}});
  };
  try {
    const file = new File(["fake-test-image"],"ignored-name.png",{type:"image/png"});
    await uploadMerchantImageFile(file,"logo",{accountMerchantId:"root",locationId:"site"});
    await uploadMerchantImageFile(file,"logo");
    assert.equal(payloads[0].get("accountMerchantId"),"root");
    assert.equal(payloads[0].get("locationId"),"site");
    assert.equal(payloads[1].get("accountMerchantId"),null);
    assert.equal(payloads[1].get("locationId"),null);
  } finally {globalThis.fetch = originalFetch;}
});
test("contrats de câblage UI : preview, QR et logo admin sans modifier le parcours marchand", () => {
  const wizard = readFileSync(new URL("components/merchant/campaign-wizard.tsx",src),"utf8");
  const posterEditor = readFileSync(new URL("components/merchant/poster-editor.tsx",src),"utf8");
  assert.match(wizard,/adminSaveEndpoint \? `\/api\/admin\/campaigns\/\$\{encodeURIComponent\(campaignId\)\}\/preview` : undefined/);
  assert.match(wizard,/qrEndpoint=\{adminSaveEndpoint/);
  assert.match(wizard,/previewPath=\{adminSaveEndpoint/);
  assert.match(posterEditor,/uploadMerchantImageFile\(file, "logo", adminTarget\)/);
});
