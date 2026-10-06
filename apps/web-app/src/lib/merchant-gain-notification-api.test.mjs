import assert from "node:assert/strict";
import { beforeEach,test } from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
const source=new URL("../",import.meta.url);
registerHooks({
  resolve(name,context,next){
    if(name==="next/server")return next("next/server.js",context);
    if(name==="@/lib/auth")return {url:"data:text/javascript,export const getAuthenticatedSession=async()=>globalThis.__notifyTest.session",shortCircuit:true};
    if(name==="@/lib/supabase")return {url:"data:text/javascript,export const getSupabaseAdmin=()=>globalThis.__notifyTest.db",shortCircuit:true};
    if(name==="resend")return {url:"data:text/javascript,export class Resend {constructor(){this.emails={send:async (...args)=>{globalThis.__notifyTest.sends.push(args);if(globalThis.__notifyTest.fail)throw Error('secret@example.test');return {data:{id:'sent-demo'}}}}}}",shortCircuit:true};
    if(name.startsWith("@/"))return next(new URL(name.slice(2)+".ts",source).href,context);
    return next(name,context);
  },
});
const route=await import("../app/api/merchant/gain-notifications/route.ts");
const results=await import("../app/api/merchant/gain-notifications/results/route.ts");
const cron=await import("../app/api/internal/gain-notifications/route.ts");
const repo=await import("./merchant-gain-notifications.ts");
let state;
beforeEach(()=>{
  state=globalThis.__notifyTest={session:{user:{id:"u"},merchant:{id:"a"},locations:[{merchant:{id:"a"}},{merchant:{id:"b"}}]},calls:[],sends:[],jobs:[]};
  state.db={
    from(table){state.calls.push(table);const q={select(){return q},eq(){return q},async maybeSingle(){return {data:state.preference??null,error:state.dbError}}};return q;},
    async rpc(name,args){state.calls.push([name,args]);
      if(state.dbError)return {error:state.dbError};
      if(name==="claim_merchant_gain_notification")return {data:state.jobs.shift()??null};
      if(name==="authorize_merchant_gain_notification")return {data:state.authorized??true};
      if(name==="prepare_merchant_gain_notification_payload")return {data:state.frozenPayload??args.p_payload};
      if(name==="set_merchant_gain_notification_preference")return {data:{frequency:args.p_frequency,updated_at:"2026-10-06T12:00Z"}};
      return {data:null};
    },
  };
});
const request=body=>new Request("https://app.okado.app/api/merchant/gain-notifications",{
  method:"POST",headers:{"origin":"https://app.okado.app","content-type":"application/json"},body:JSON.stringify(body),
});
test("préférence : authentification, cloisonnement, origine, fréquence et destinataire non injectable",async()=>{
  state.session=null;assert.equal((await route.GET(new Request("https://app.okado.app/api/merchant/gain-notifications"))).status,401);
  assert.equal(state.calls.length,0);
  state.session={user:{id:"u"},merchant:{id:"a"},locations:[{merchant:{id:"a"}}]};
  assert.equal((await route.GET(new Request("https://app.okado.app/api/merchant/gain-notifications?location=b"))).status,403);
  assert.equal((await route.POST(request({location:"b",frequency:"daily"}))).status,403);
  assert.equal((await route.POST(request({location:"a",frequency:"inconnu"}))).status,400);
  const crossOrigin=new Request("https://app.okado.app/api/merchant/gain-notifications",{method:"POST",headers:{origin:"https://evil.test"},body:"{}"});
  assert.equal((await route.POST(crossOrigin)).status,403);
  const defaults=await route.GET(new Request("https://app.okado.app/api/merchant/gain-notifications?location=a"));
  assert.equal(defaults.headers.get("cache-control"),"private, no-store");
  assert.equal((await defaults.json()).frequency,"disabled");
  const response=await route.POST(request({location:"a",frequency:"weekly",userId:"v",recipient:"injected@example.test"}));
  assert.equal(response.status,200);
  assert.deepEqual(state.calls.at(-1),["set_merchant_gain_notification_preference",{p_user:"u",p_merchant:"a",p_frequency:"weekly"}]);
});
test("réponses d’erreur sans secret, pas de préférence faussement enregistrée",async()=>{
  state.dbError={message:"secret@example.test"};
  const response=await route.POST(request({location:"a",frequency:"daily"}));
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
test("cron protégé y compris lorsque le secret est absent",async()=>{
  delete process.env.CRON_SECRET;
  assert.equal((await cron.GET(new Request("https://app.okado.app/api/internal/gain-notifications"))).status,401);
  process.env.CRON_SECRET="test-only";
  assert.equal((await cron.GET(new Request("https://app.okado.app/api/internal/gain-notifications",{headers:{authorization:"Bearer wrong"}}))).status,401);
  process.env.VERCEL_ENV="preview";
  assert.equal((await cron.GET(new Request("https://app.okado.app/api/internal/gain-notifications",{headers:{authorization:"Bearer test-only"}}))).status,200);
  assert.equal(state.calls.length,0);assert.equal(state.sends.length,0);
});
const job={id:"job-demo",lease_token:"lease-demo",merchant_id:"a",merchant_name:"Institut Démo",recipient:"owner@example.test",frequency:"instant",time_zone:"Europe/Paris",period_start:"2026-10-06T10:00Z",period_end:"2026-10-06T10:01Z",part:1,parts:1,gains:[{leadId:"g",campaignId:"c",campaignTitle:"Jeu Démo",prizeLabel:"Soin offert",wonAt:"2026-10-06T10:00Z"}]};
function config(){process.env.VERCEL_ENV="production";process.env.MERCHANT_GAIN_NOTIFICATIONS_ENABLED="true";process.env.RESEND_API_KEY="fake-test";process.env.RESEND_FROM_EMAIL="test@example.test";process.env.MERCHANT_GAIN_NOTIFICATIONS_ORIGIN="https://app.okado.app";}
test("envoi réel simulé : payload dynamique, clé idempotente et confirmation persistante",async()=>{
  config();state.jobs=[job];assert.deepEqual(await repo.dispatchMerchantGainNotifications("g"),{sent:1,failed:0,skipped:false});
  assert.equal(state.sends.length,1);assert.deepEqual(state.sends[0][1],{idempotencyKey:"merchant-gain/job-demo"});
  assert.equal(state.sends[0][0].to,"owner@example.test");assert.match(state.sends[0][0].html,/Soin offert/);
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
test("câblage non bloquant uniquement des deux finalisations réelles",()=>{
  for(const name of ["route.ts","finalize/route.ts"]){
    const text=readFileSync(new URL(`../app/api/public/draw/${name}`,import.meta.url),"utf8");
    assert.equal((text.match(/dispatchMerchantGainNotifications\(result.lead.id\)/g)??[]).length,1);
    assert.match(text,/if \(result.prize\) after\(async/);
  }
  const finalize=readFileSync(new URL("../app/api/public/draw/finalize/route.ts",import.meta.url),"utf8");
  assert.doesNotMatch(finalize.split("return NextResponse.json(toPublicDrawResult(result)")[0],/dispatchMerchantGainNotifications\(result.lead/);
});
