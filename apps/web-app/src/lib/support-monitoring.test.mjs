import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
const src=new URL("../",import.meta.url);
const mocks={
  "@/lib/supabase":"export const getSupabaseAdmin=()=>globalThis.__monitor.db;",
  "@/lib/auth":"export const requireAuthenticatedSession=async()=>globalThis.__monitor.session;",
  "@/components/merchant/brevo-sync-button":"export const BrevoSyncButton=()=>null;",
  "@/lib/merchant-gain-notifications":"export const dispatchMerchantGainNotifications=async()=>{if(globalThis.__monitor.dispatchError)throw Error('private-secret');return globalThis.__monitor.dispatchResult}; export const getMerchantGainNotificationFailureContext=()=>({stage:'test'});",
  "@/lib/support-log":"export const logSupportEvent=()=>{};",
  "next/navigation":"export const redirect=p=>{throw Error('redirect:'+p)};export const useRouter=()=>({refresh(){}});",
};
registerHooks({
  resolve(name,ctx,next){
    if(name==="next/server")return next("next/server.js",ctx);
    if(mocks[name])return {url:"data:text/javascript,"+encodeURIComponent(mocks[name]),shortCircuit:true};
    if(name.startsWith("@/")){
      const file=new URL(name.slice(2)+".ts",src);
      return next(existsSync(file)?file.href:new URL(name.slice(2)+".tsx",src).href,ctx);
    }
    return next(name,ctx.parentURL?.startsWith("data:")?{...ctx,parentURL:import.meta.url}:ctx);
  },
  load(url,ctx,next){
    if(url.startsWith(src.href)&&/\.tsx?$/.test(url))return {format:"module",source:ts.transpileModule(readFileSync(new URL(url),"utf8"),
      {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
    return next(url,ctx);
  },
});
const {getSupportMonitoring,parseSupportFilters,supportHref}=await import("./support-monitoring.ts");
const {recordGainNotificationRun}=await import("./support-task-log.ts");
const cron=await import("../app/api/internal/gain-notifications/route.ts");
const page=(await import("../app/(merchant)/support/page.tsx")).default;
let state;
beforeEach(()=>{
  state=globalThis.__monitor={session:{user:{email:"pierreh.brunelle@gmail.com"}},calls:[],writes:[],error:null};
  state.db={
    async rpc(name,args){
      state.calls.push([name,args]);
      if(state.reject===args.p_section)throw Error("private-secret");
      if(state.error===args.p_section)return {error:{message:"private-secret"}};
      if(args.p_section==="locations")return {data:[{id:"a",name:"Institut Démo"}]};
      const rows=args.p_section==="emails"?[
        {id:"11111111-1111-4111-8111-111111111111",kind:"reward",at:"2026-10-11T12:00Z",status:"failed",title:"Jeu démo",
          participant:"Camille",recipient:"camille@example.test",detail:"<script>injection</script>",canHandle:true,eventAt:"2026-10-11T12:00:00.123456Z"},
        {id:"job",kind:"notification",at:"2026-10-11T12:00Z",status:"needs_review",title:"weekly",merchant:"Institut Démo",attempts:6},
      ]:args.p_section==="webhooks"?[{id:"webhook",kind:"webhook",at:"2026-06-18T18:10Z",status:"email.delivered"}]
      :args.p_section==="claims"?[{id:"claim",kind:"claim",at:"2026-10-11T12:00Z",status:"claimed",detail:"Soin",code:"DEMO"}]:[];
      return {data:{rows,total:58,page:args.p_page,stats:args.p_section==="emails"
        ?{incidents:55,queued:2,jobsWaiting:4,jobsRetry:1,jobsReview:3,eventsWaiting:6}
        :args.p_section==="webhooks"?{latestWebhook:"2026-06-18T18:10Z"}:{lastRun:null,errorLogs:0}}};
    },
    from(table){return {async insert(row){state.writes.push([table,row]);return {error:state.insertError};}};},
  };
});
test("filtres : dates strictes, bornes, répétitions, liens sûrs et conservation indépendante des pages",()=>{
  assert.ok(parseSupportFilters({from:"2026-02-30"}).error);
  assert.ok(parseSupportFilters({from:"2026-10-12",to:"2026-10-11"}).error);
  assert.ok(!parseSupportFilters({from:"2026-10-11",to:"2026-10-11"}).error);
  const f=parseSupportFilters({q:["jeu & lot","autre"],emailsPage:"2",logsPage:"3",section:"bad",incidents:"bad"});
  assert.equal(f.q,"jeu & lot");assert.equal(f.section,"all");assert.equal(f.incidents,"all");
  const href=supportHref(f,{emailsPage:3});
  assert.match(href,/q=jeu\+%26\+lot/);assert.match(href,/logsPage=3/);
  assert.equal(parseSupportFilters({emailsPage:"99999999999"}).pages.emails,1000000);
  assert.equal(parseSupportFilters({q:"x".repeat(500)}).q.length,200);
});
test("autorisations : refus avant toute lecture, y compris service role direct",async()=>{
  await assert.rejects(getSupportMonitoring("merchant@example.test",parseSupportFilters({})),/administrateur/);
  assert.equal(state.calls.length,0);
  state.session.user.email="merchant@example.test";
  await assert.rejects(page({searchParams:Promise.resolve({})}),/redirect/);
  assert.equal(state.calls.length,0);
});
test("DAL : filtres en base, dates UTC inclusives, cinq lectures et état actuel hors recherche",async()=>{
  const filters=parseSupportFilters({merchant:"a",q:"ancien",from:"2026-10-11",to:"2026-10-11",emailsPage:"3"});
  const data=await getSupportMonitoring(state.session.user.email,filters);
  assert.equal(state.calls.length,5);assert.equal(data.sections.emails.total,58);
  const args=state.calls.find(([,a])=>a.p_section==="emails")[1];
  assert.deepEqual(args,{p_section:"emails",p_merchant:"a",p_query:"ancien",p_from:"2026-10-11T00:00:00Z",
    p_until:"2026-10-12T00:00:00.000Z",p_status:"all",p_incidents:"all",p_page:3,p_size:25});
  assert.equal(state.writes.length,0);
});
test("panne partielle : indisponible, sans zéro fictif ni divulgation ; dates invalides sans requête",async()=>{
  state.error="logs";state.reject="webhooks";
  const data=await getSupportMonitoring(state.session.user.email,parseSupportFilters({}));
  assert.equal(data.sections.logs.available,false);assert.equal(data.sections.logs.total,null);
  assert.equal(data.sections.webhooks.available,false);assert.equal(data.sections.emails.available,true);
  const html=renderToStaticMarkup(await page({searchParams:Promise.resolve({})}));
  assert.match(html,/Données indisponibles/);assert.doesNotMatch(html,/private-secret|Aucune erreur récente|Synchronisation active/);
  state.calls=[];
  const invalid=await getSupportMonitoring(state.session.user.email,parseSupportFilters({from:"bad"}));
  assert.equal(state.calls.length,0);assert.equal(invalid.sections.emails.total,null);
});
test("rendu : quatre tableaux, compteurs exacts, états non trompeurs, acquittement et échappement",async()=>{
  const html=renderToStaticMarkup(await page({searchParams:Promise.resolve({q:"1",emailsPage:"2"})}));
  assert.equal((html.match(/<table\b/g)??[]).length,4);
  assert.match(html,/2 affichés sur 58 résultats/);assert.match(html,/Page 2 \/ 3/);
  assert.match(html,/Synthèse hebdomadaire|Synthèse hebdomadaire/);
  assert.match(html,/Intervention requise/);assert.match(html,/Marquer comme traité/);
  assert.match(html,/&lt;script&gt;injection/);assert.doesNotMatch(html,/<script>/);
  assert.match(html,/Non observé/);assert.doesNotMatch(html,/Synchronisation active|Santé production|Suivi vendeur requis/);
  assert.equal((renderToStaticMarkup(await page({searchParams:Promise.resolve({section:"logs"})})).match(/<table\b/g)??[]).length,1);
});
test("traces planifiées : attendues, whitelist non nominative, preview sans écriture, échec non bloquant",async()=>{
  const original=process.env.VERCEL_ENV;
  try{
    process.env.VERCEL_ENV="preview";await recordGainNotificationRun(false,{sent:1});assert.equal(state.writes.length,0);
    process.env.VERCEL_ENV="production";
    await recordGainNotificationRun(false,{sent:3,failed:1,recipient:"secret@example.test",payload:"private"});
    assert.equal(state.writes[0][1].event,"gain_notification_scheduled_run");
    assert.doesNotMatch(JSON.stringify(state.writes),/secret|private/);
    await recordGainNotificationRun(true,{},true);assert.equal(state.writes[1][1].level,"error");
    state.insertError={message:"private-secret"};
    await recordGainNotificationRun(true,{skipped:true});
    assert.equal(state.writes[2][1].level,"warn");
  }finally{if(original===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=original;}
});
test("vraie route planifiée : autorisation avant trace, succès attendu et échec durable sans secret",async()=>{
  const original=process.env.VERCEL_ENV,secret=process.env.CRON_SECRET;
  try{
    process.env.VERCEL_ENV="production";process.env.CRON_SECRET="test-only";
    const make=authorized=>new Request("https://app.okado.app/api/internal/gain-notifications/recovery",
      {headers:{authorization:authorized?"Bearer test-only":"Bearer wrong"}});
    assert.equal((await cron.GET(make(false))).status,401);assert.equal(state.writes.length,0);
    state.dispatchResult={sent:2,failed:0,skipped:false};
    assert.equal((await cron.GET(make(true))).status,200);
    assert.equal(state.writes[0][1].event,"gain_notification_recovery_run");
    state.dispatchError=true;
    const failed=await cron.GET(make(true));
    assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/private-secret/);
    assert.equal(state.writes[1][1].level,"error");
  }finally{
    if(original===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=original;
    if(secret===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=secret;
  }
});
