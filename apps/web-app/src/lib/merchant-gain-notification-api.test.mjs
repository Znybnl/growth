import assert from "node:assert/strict";
import { beforeEach,test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
const source=new URL("../",import.meta.url);
registerHooks({
  resolve(name,context,next){
    if(name==="next/server")return {url:`data:text/javascript,export {NextRequest,NextResponse} from ${JSON.stringify(import.meta.resolve("next/server.js"))};export const after=fn=>globalThis.__notifyTest.afters.push(fn);`,shortCircuit:true};
    if(name==="@/lib/auth")return {url:"data:text/javascript,export const getAuthenticatedSession=async()=>globalThis.__notifyTest.session",shortCircuit:true};
    if(name==="@/lib/supabase")return {url:"data:text/javascript,export const getSupabaseAdmin=()=>globalThis.__notifyTest.db",shortCircuit:true};
    if(name==="@/lib/campaign-repository")return {url:"data:text/javascript,export const getSupabaseRetryableRewardEmailCandidates=async()=>[];export const getSupabaseCampaignPerformance=async()=>null;export const getSupabaseRewardEmailResendPayload=async()=>null",shortCircuit:true};
    if(name==="@/lib/reward-email")return {url:"data:text/javascript,export const sendRewardEmail=async()=>{throw Error('Unexpected participant email')}",shortCircuit:true};
    if(name==="@/lib/merchant-image-storage")return {url:"data:text/javascript,export const purgeUnreferencedMerchantImages=async()=>0",shortCircuit:true};
    if(name==="@/lib/support-log")return {url:"data:text/javascript,export const logSupportEvent=(...args)=>globalThis.__notifyTest.logs.push(args)",shortCircuit:true};
    if(name==="resend")return {url:"data:text/javascript,export class Resend {constructor(){this.emails={send:async (...args)=>{globalThis.__notifyTest.sends.push(args);if(globalThis.__notifyTest.fail)throw Error('secret@example.test');return {data:{id:'sent-demo'}}}}}}",shortCircuit:true};
    if(name.startsWith("@/"))return next(new URL(name.slice(2)+".ts",source).href,context);
    return next(name,context);
  },
});
const route=await import("../app/api/merchant/gain-notifications/route.ts");
const results=await import("../app/api/merchant/gain-notifications/results/route.ts");
const account=await import("../app/api/merchant/gain-notifications/account/route.ts");
const cron=await import("../app/api/internal/gain-notifications/route.ts");
const recovery=await import("../app/api/internal/gain-notifications/recovery/route.ts");
const maintenance=await import("../app/api/internal/maintenance/route.ts");
const { NextRequest }=await import("next/server");
const repo=await import("./merchant-gain-notifications.ts");
let state;
beforeEach(()=>{
  delete process.env.MAINTENANCE_ENABLED;
  state=globalThis.__notifyTest={session:{user:{id:"u"},merchant:{id:"a"},locations:[{merchant:{id:"a"}},{merchant:{id:"b"}}]},calls:[],sends:[],jobs:[],afters:[],logs:[]};
  state.db={
    from(table){state.calls.push(table);const q={select(){return q},eq(){return q},async maybeSingle(){return {data:state.preference??null,error:state.dbError}}};return q;},
    async rpc(name,args){state.calls.push([name,args]);
      if(state.dbError)return {error:state.dbError};
      if(name==="claim_merchant_gain_notification")return {data:state.jobs.shift()??null};
      if(name==="get_merchant_gain_notification_digest_context")return {data:state.digestContext??{redeemedCount:0,stocks:[]}};
      if(name==="authorize_merchant_gain_notification")return {data:state.authorized??true};
      if(name==="prepare_merchant_gain_notification_payload")return {data:state.frozenPayload??args.p_payload};
      if(name==="set_merchant_gain_notification_preferences")return {data:{enabled_frequencies:args.p_frequencies,updated_at:"2026-10-06T12:00Z"}};
      return {data:null};
    },
  };
});
const request=body=>new Request("https://app.okado.app/api/merchant/gain-notifications",{
  method:"POST",headers:{"origin":"https://app.okado.app","content-type":"application/json"},body:JSON.stringify(body),
});
test("préférence : authentification, cloisonnement, origine, sélections multiples et destinataire non injectable",async()=>{
  state.session=null;assert.equal((await route.GET(new Request("https://app.okado.app/api/merchant/gain-notifications"))).status,401);
  assert.equal(state.calls.length,0);
  state.session={user:{id:"u"},merchant:{id:"a"},locations:[{merchant:{id:"a"}}]};
  assert.equal((await route.GET(new Request("https://app.okado.app/api/merchant/gain-notifications?location=b"))).status,403);
  assert.equal((await route.POST(request({location:"b",frequencies:["daily"]}))).status,403);
  assert.equal((await route.POST(request({location:"a",frequencies:["inconnu"]}))).status,400);
  assert.equal((await route.POST(request({location:"a",frequencies:["daily","disabled"]}))).status,400);
  const crossOrigin=new Request("https://app.okado.app/api/merchant/gain-notifications",{method:"POST",headers:{origin:"https://evil.test"},body:"{}"});
  assert.equal((await route.POST(crossOrigin)).status,403);
  const defaults=await route.GET(new Request("https://app.okado.app/api/merchant/gain-notifications?location=a"));
  assert.equal(defaults.headers.get("cache-control"),"private, no-store");
  assert.deepEqual((await defaults.json()).frequencies,[]);
  const response=await route.POST(request({location:"a",frequencies:["daily","weekly","daily"],userId:"v",recipient:"injected@example.test"}));
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{frequencies:["daily","weekly"],updatedAt:"2026-10-06T12:00Z"});
  assert.deepEqual(state.calls.at(-1),["set_merchant_gain_notification_preferences",{p_user:"u",p_merchant:"a",p_frequencies:["daily","weekly"]}]);
});
test("réponses d’erreur sans secret, pas de préférence faussement enregistrée",async()=>{
  state.dbError={message:"secret@example.test"};
  const response=await route.POST(request({location:"a",frequencies:["daily"]}));
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/secret/);
});
test("lien résultats authentifié vers le bon site, aucun accès élargi ni token public",async()=>{
  state.session=null;assert.match((await results.GET(new Request("https://app.okado.app/api/merchant/gain-notifications/results?location=a"))).headers.get("location"),/connexion/);
  state.session={locations:[{merchant:{id:"a"}}]};
  assert.equal((await results.GET(new Request("https://app.okado.app/api/merchant/gain-notifications/results?location=b"))).status,403);
  const response=await results.GET(new Request("https://app.okado.app/api/merchant/gain-notifications/results?location=a"));
  assert.equal(response.headers.get("location"),"https://app.okado.app/data");
  assert.match(response.headers.get("set-cookie"),/okado_active_location=a/);
  assert.match(response.headers.get("set-cookie"),/HttpOnly/);
});
test("lien préférences authentifié, bon établissement, aucune modification de préférence",async()=>{
  const url="https://app.okado.app/api/merchant/gain-notifications/account";
  state.session=null;
  assert.match((await account.GET(new Request(url+"?location=a"))).headers.get("location"),/connexion/);
  state.session={locations:[{merchant:{id:"a"}}]};
  assert.equal((await account.GET(new Request(url+"?location=b&next=https://evil.test"))).status,403);
  assert.equal((await account.GET(new Request(url))).status,403);
  state.session.locations.push({merchant:{id:"b"}});
  const response=await account.GET(new Request(url+"?location=b&next=https://evil.test"));
  assert.equal(response.headers.get("location"),"https://app.okado.app/account#account-user");
  assert.equal(response.headers.get("cache-control"),"private, no-store");
  assert.match(response.headers.get("set-cookie"),/okado_active_location=b/);
  assert.match(response.headers.get("set-cookie"),/HttpOnly/);
  assert.equal(state.calls.length,0);
});

test("cron protégé y compris lorsque le secret est absent",async()=>{
  delete process.env.CRON_SECRET;
  assert.equal((await cron.GET(new Request("https://app.okado.app/api/internal/gain-notifications"))).status,401);
  process.env.CRON_SECRET="test-only";
  assert.equal((await cron.GET(new Request("https://app.okado.app/api/internal/gain-notifications",{headers:{authorization:"Bearer wrong"}}))).status,401);
  process.env.VERCEL_ENV="preview";
  assert.equal((await cron.GET(new Request("https://app.okado.app/api/internal/gain-notifications",{headers:{authorization:"Bearer test-only"}}))).status,200);
  assert.equal(state.calls.length,0);assert.equal(state.sends.length,0);
});
const job={id:"job-demo",lease_token:"lease-demo",merchant_id:"a",merchant_name:"Institut Démo",recipient:"owner@example.test",frequency:"instant",time_zone:"Europe/Paris",period_start:"2026-10-06T10:00Z",period_end:"2026-10-06T10:01Z",part:1,parts:1,gains:[{leadId:"g",campaignId:"c",campaignTitle:"Jeu Démo",prizeLabel:"Soin offert",wonAt:"2026-10-06T10:00Z",firstName:"Camille",lastName:"Martin"}]};
function config(){process.env.VERCEL_ENV="production";process.env.MERCHANT_GAIN_NOTIFICATIONS_ENABLED="true";process.env.RESEND_API_KEY="fake-test";process.env.RESEND_FROM_EMAIL="test@example.test";process.env.MERCHANT_GAIN_NOTIFICATIONS_ORIGIN="https://app.okado.app";}
test("envoi réel simulé : payload dynamique, clé idempotente et confirmation persistante",async()=>{
  config();state.jobs=[job];assert.deepEqual(await repo.dispatchMerchantGainNotifications("g"),{sent:1,failed:0,skipped:false,limitReached:false});
  const claim=state.calls.find(c=>Array.isArray(c)&&c[0]==="claim_merchant_gain_notification");
  assert.equal(typeof claim[1].p_now,"string");assert.equal(claim[1].p_lead,"g");
  assert.equal(state.sends.length,1);assert.deepEqual(state.sends[0][1],{idempotencyKey:"merchant-gain/job-demo"});
  assert.equal(state.sends[0][0].to,"owner@example.test");assert.match(state.sends[0][0].html,/Soin offert/);
  assert.match(state.sends[0][0].html,/Camille Martin/);assert.match(state.sends[0][0].text,/Camille Martin/);
  assert.deepEqual(state.calls.find(c=>c[0]==="finish_merchant_gain_notification")[1],{p_id:"job-demo",p_token:"lease-demo",p_sent:true,p_provider_id:"sent-demo"});
});
test("erreur fournisseur et accès perdu : aucun envoi hors périmètre ; reprise sans erreur sensible",async()=>{
  config();state.jobs=[job];state.fail=true;
  assert.equal((await repo.dispatchMerchantGainNotifications()).failed,1);
  assert.equal(state.calls.find(c=>c[0]==="finish_merchant_gain_notification")[1].p_sent,false);
  state.jobs=[job];state.authorized=false;state.sends=[];
  await repo.dispatchMerchantGainNotifications();assert.equal(state.sends.length,0);
});
test("une reprise envoie le payload déjà figé même après un changement de rendu",async()=>{
  config();state.jobs=[job];
  state.frozenPayload={subject:"Original",html:"<p>Original</p>",text:"Original",from:"Okado <original@example.test>"};
  await repo.dispatchMerchantGainNotifications();
  assert.deepEqual(state.sends[0][0],{...state.frozenPayload,to:"owner@example.test"});
});
test("une synthèse lit le KPI et les stocks pour la fenêtre et l'établissement du job",async()=>{
  config();
  state.jobs=[{...job,frequency:"weekly",period_start:"2026-10-05T22:00:00Z",period_end:"2026-10-12T22:00:00Z"}];
  state.digestContext={redeemedCount:2,stocks:[
    {campaignTitle:"Jeu actif",prizeLabel:"Soin",totalQuantity:5,remainingQuantity:0},
  ]};
  await repo.dispatchMerchantGainNotifications();
  const contextCall=state.calls.find(c=>Array.isArray(c)&&c[0]==="get_merchant_gain_notification_digest_context");
  assert.deepEqual(contextCall[1],{
    p_merchant_id:"a",p_period_start:"2026-10-05T22:00:00Z",p_period_end:"2026-10-12T22:00:00Z",
  });
  assert.match(state.sends[0][0].html,/Lots récupérés pendant la période/);
  assert.match(state.sends[0][0].html,/STOCK ÉPUISÉ/);
  assert.match(state.sends[0][0].text,/Lots récupérés pendant la période : 2/);
});
test("câblage non bloquant uniquement des deux finalisations réelles",()=>{
  for(const name of ["route.ts","finalize/route.ts"]){
    const text=readFileSync(new URL(`../app/api/public/draw/${name}`,import.meta.url),"utf8");
    assert.equal((text.match(/dispatchMerchantGainNotifications\(result.lead.id\)/g)??[]).length,1);
    assert.match(text,/if \(result.prize\) after\(async/);
  }
  const finalize=readFileSync(new URL("../app/api/public/draw/finalize/route.ts",import.meta.url),"utf8");
  assert.doesNotMatch(finalize.split("return NextResponse.json(toPublicDrawResult(result)")[0],/dispatchMerchantGainNotifications\(result.lead/);
});

test("planification quotidienne sans forfait supérieur, reprise indépendante des purges",()=>{
  const config=JSON.parse(readFileSync(new URL("../../vercel.json",import.meta.url),"utf8"));
  assert.deepEqual(config.crons,[
    {path:"/api/internal/maintenance",schedule:"15 3 * * *"},
    {path:"/api/internal/gain-notifications/recovery",schedule:"15 3 * * *"},
    {path:"/api/internal/gain-notifications",schedule:"0 8 * * *"},
  ]);
  const ui=readFileSync(new URL("../components/merchant/gain-notification-settings.tsx",import.meta.url),"utf8");
  assert.match(ui,/horaire indicatif/);assert.doesNotMatch(ui,/lundi à 9 h/);
  const route=readFileSync(new URL("../app/api/internal/gain-notifications/route.ts",import.meta.url),"utf8");
  assert.match(route,/budgetMs: 240_000, minIntervalMs: 600/);
});

test("un passage traite plus de vingt destinataires ou parties sans changer leurs clés",async()=>{
  config();state.jobs=Array.from({length:25},(_,i)=>({...job,id:`job-${i}`}));
  const result=await repo.dispatchMerchantGainNotifications(undefined,200);
  assert.deepEqual(result,{sent:25,failed:0,skipped:false,limitReached:false});
  assert.equal(new Set(state.sends.map(s=>s[1].idempotencyKey)).size,25);
});

test("budget épuisé : aucune nouvelle lease ni envoi, limite signalée",async()=>{
  config();state.jobs=[job];
  assert.deepEqual(await repo.dispatchMerchantGainNotifications(undefined,200,{budgetMs:0}),
    {sent:0,failed:0,skipped:false,limitReached:true});
  assert.equal(state.calls.length,0);assert.equal(state.jobs.length,1);
});

test("volume borné : les parties non tentées restent en attente, sans troncature",async()=>{
  config();state.jobs=Array.from({length:205},(_,i)=>({...job,id:`job-${i}`}));
  const result=await repo.dispatchMerchantGainNotifications(undefined,1000);
  assert.equal(result.sent,200);assert.equal(result.limitReached,true);
  assert.equal(state.jobs.length,5);
});

test("maintenance désactivée par défaut : authentification sans purge ni notification",async()=>{
  config();process.env.CRON_SECRET="test-only";
  const url="https://app.okado.app/api/internal/maintenance";
  assert.equal((await maintenance.GET(new NextRequest(url))).status,401);
  assert.equal(state.afters.length,0);
  state.jobs=[job];
  assert.equal((await maintenance.GET(new NextRequest(url,{headers:{authorization:"Bearer test-only"}}))).status,200);
  const response=await maintenance.GET(new NextRequest(url,{headers:{authorization:"Bearer test-only"}}));
  assert.deepEqual(await response.json(),{ok:true,skipped:true});
  assert.equal(response.headers.get("cache-control"),"no-store");
  assert.equal(state.calls.length,0);assert.equal(state.sends.length,0);assert.equal(state.afters.length,0);
  process.env.MAINTENANCE_ENABLED="false";
  await maintenance.GET(new NextRequest(url,{headers:{authorization:"Bearer test-only"}}));
  assert.equal(state.calls.length,0);
});

test("la maintenance explicitement activée conserve les purges sans envoyer de notification",async()=>{
  config();process.env.CRON_SECRET="test-only";process.env.MAINTENANCE_ENABLED="true";state.jobs=[job];
  const response=await maintenance.GET(new NextRequest("https://app.okado.app/api/internal/maintenance",{headers:{authorization:"Bearer test-only"}}));
  assert.equal(response.status,200);
  assert.deepEqual(state.calls.map(c=>c[0]),["purge_operational_data","purge_personal_data"]);
  assert.equal(state.sends.length,0);assert.equal(state.afters.length,0);assert.equal(state.jobs.length,1);
});

test("reprise protégée indépendante d'une purge en panne, erreur sans données sensibles",async()=>{
  config();process.env.CRON_SECRET="test-only";
  const url="https://app.okado.app/api/internal/gain-notifications/recovery";
  assert.equal((await recovery.GET(new Request(url))).status,401);
  assert.equal((await recovery.GET(new Request(url,{headers:{authorization:"Bearer wrong"}}))).status,401);
  assert.equal(state.calls.length,0);
  const rpc=state.db.rpc;
  state.db.rpc=async(name,args)=>name==="purge_operational_data"?{error:{message:"purge failed"}}:rpc(name,args);
  process.env.MAINTENANCE_ENABLED="true";
  assert.equal((await maintenance.GET(new NextRequest("https://app.okado.app/api/internal/maintenance",{headers:{authorization:"Bearer test-only"}}))).status,500);
  state.calls=[];state.jobs=[job];
  const response=await recovery.GET(new Request(url,{headers:{authorization:"Bearer test-only"}}));
  assert.equal(response.status,200);assert.equal((await response.json()).sent,1);
  assert.ok(state.calls.every(c=>!c[0].startsWith("purge_")));
  state.dbError={message:"secret@example.test",code:"PGRST202"};
  const failed=await recovery.GET(new Request(url,{headers:{authorization:"Bearer test-only"}}));
  assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/secret@example/);
  assert.doesNotMatch(JSON.stringify(state.logs),/secret@example/);
  assert.ok(state.logs.some(l=>l[1]==="merchant_gain_notification_dispatch_failed"&&l[2]?.stage==="claim"&&l[2]?.errorCode==="PGRST202"));
});
