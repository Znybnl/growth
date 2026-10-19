import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";

// Infrastructure mocks only: handlers, DAL, permissions and page are real.
const src = new URL("../", import.meta.url);
const mocks = {
  "@/lib/auth": "export const getAuthenticatedSession=async()=>globalThis.__supportTest.session; export const requireAuthenticatedSession=getAuthenticatedSession;",
  "@/lib/supabase": "export const getSupabaseAdmin=()=>globalThis.__supportTest.db; export const isSupabaseConfigured=()=>true; export const isMemoryStoreFallbackAllowed=()=>false; export const unwrapSupabaseResult=r=>{if(r.error)throw Error('Read failed');return r.data}; export const assertSupabaseResult=r=>{if(r.error)throw Error('Read failed')};",
  "@/lib/merchant-account-repository": "export const updateMerchantBillingFromStripeSubscriptionInSupabase=async()=>{throw Error('Unexpected billing write')};",
  "@/lib/stripe": "export const getStripeClient=()=>{throw Error('Unexpected Stripe call')};",
  "@/lib/support-log": "export const logSupportEvent=()=>{};",
  "@/lib/store": "export const getMerchantSupportOverview=async()=>globalThis.__supportTest.overview;",
  "@/components/merchant/brevo-sync-button": "export const BrevoSyncButton=()=>null;",
  "next/navigation": "export const redirect=p=>{throw Error('redirect:'+p)}; export const useRouter=()=>({refresh(){}});",
};
registerHooks({
  resolve(name, context, next) {
    if (mocks[name]) return { url: `data:text/javascript,${encodeURIComponent(mocks[name])}`, shortCircuit: true };
    if (name.startsWith("@/")) {
      const target = new URL(name.slice(2)+".ts", src);
      return next(existsSync(target) ? target.href : new URL(name.slice(2)+".tsx", src).href, context);
    }
    if (name === "next/server") return next("next/server.js", context);
    return next(name, context.parentURL?.startsWith("data:") ? {...context,parentURL:import.meta.url} : context);
  },
  load(url, context, next) {
    if (url.startsWith(src.href) && /\.tsx?$/.test(url)) return {format:"module",source:ts.transpileModule(readFileSync(new URL(url),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
    return next(url, context);
  },
});
const route = await import("../app/api/admin/support/email-incidents/[id]/handle/route.ts");
const alerts = await import("../app/api/merchant/email-alerts/route.ts");
const { getSaasAdminOverview } = await import("./admin-repository.ts");
const { getSupabaseMerchantSupportOverview } = await import("./campaign-repository.ts");
const { SupportTables } = await import("../components/merchant/support-tables.tsx");
const id = "11111111-1111-4111-8111-111111111111";
const eventAt = "2026-06-30T09:05:00.123456+00:00";
let state;
function fakeDb() {
  return {
    rpc(name,args) {
      state.calls.push([name,args]);
      if (name === "get_merchant_operational_alerts") {
        assert.equal(args.p_merchant_id,"site");
        const failures=state.tables.reward_email_deliveries.filter(d=>!d.support_is_handled &&
          ["failed","bounced","complained","suppressed"].includes(d.status));
        return Promise.resolve({data:[{email_count:failures.length,email_campaign_id:failures[0]?.campaign_id??null,
          low_stock_count:0,exhausted_stock_count:1,stock_campaign_id:"c"}],error:null});
      }
      if (name === "get_platform_operational_metrics") {
        const rows=[{merchant_id:"site",contacts:1,pending_rewards:1,low_stock:0,exhausted_stock:1,
          failed_emails:state.tables.reward_email_deliveries.filter(d=>!d.support_is_handled && ["failed","bounced","complained","suppressed"].includes(d.status)).length}];
        const q={order(){return q},range(){return q},then(resolve,reject){return Promise.resolve({data:rows,count:rows.length,error:null}).then(resolve,reject)}};
        return q;
      }
      return Promise.resolve({data:state.rpcResult,error:state.rpcError});
    },
    from(table) {
      state.reads.push(table);
      const filters = [];
      let maximum = Infinity, exact = false, offset = 0;
      const q = {
        select(_fields,options) {exact=options?.count === "exact";return q;},
        eq(key,value) {filters.push(row=>row[key] === value);return q;},
        in(key,values) {filters.push(row=>values.includes(row[key]));return q;},
        not(key,_op,value) {filters.push(row=>row[key] !== value);return q;},
        order() {return q;}, limit(n) {maximum=n;return q;},
        range(start,end) {offset=start;maximum=end-start+1;return q;},
        then(resolve,reject) {
          const rows = (state.tables[table] ?? []).filter(row=>filters.every(filter=>filter(row)));
          return Promise.resolve({data:rows.slice(offset,offset+maximum),count:exact?rows.length:null,error:state.errorTable===table?{message:"secret@example.test"}:null}).then(resolve,reject);
        },
      };
      return q;
    },
  };
}
beforeEach(() => {
  state = globalThis.__supportTest = {
    session:{user:{id:"admin",email:"pierreh.brunelle@gmail.com"},merchant:{id:"site"}},
    calls:[],reads:[],rpcResult:true,
    tables:{
      merchants:[{id:"site",company_name:"Institut Démo"}],
      merchant_users:[{id:"owner",merchant_id:"site",first_name:"Camille",last_name:"Test",email:"owner@example.test"}],
      campaigns:[{id:"c",merchant_id:"site",title:"Jeu Démo",is_active:true}],
      leads:[{id:"lead",campaign_id:"c",prize_id:"p",status:"claimed",first_name:"Camille"}],
      prizes:[{id:"p",campaign_id:"c",label:"Soin",total_quantity:10,remaining_quantity:0}],
      reward_email_deliveries:[
        {id,campaign_id:"c",lead_id:"lead",recipient_email:"player@example.test",status:"failed",last_event_at:eventAt,created_at:eventAt,support_is_handled:false},
        {id:"handled-demo",campaign_id:"c",lead_id:"lead",recipient_email:"handled@example.test",status:"bounced",last_event_at:eventAt,created_at:eventAt,support_is_handled:true,support_handled_at:"2026-10-11T12:00Z"},
      ],
    },
  };
  state.db = fakeDb();
});
const params = {params:Promise.resolve({id})};
function request(body={eventAt,status:"failed"},origin="https://app.okado.app") {
  return new Request("https://app.okado.app/api/admin/support/email-incidents/"+id+"/handle",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)});
}

test("admin uniquement : 401/403 et origine refusés avant lecture ou mutation",async()=>{
  state.session=null;assert.equal((await route.POST(request(),params)).status,401);
  state.session={user:{id:"owner",email:"owner@example.test"}};
  assert.equal((await route.POST(request(),params)).status,403);
  state.session={user:{id:"admin",email:"pierreh.brunelle@gmail.com"}};
  assert.equal((await route.POST(request(undefined,"https://evil.test"),params)).status,403);
  const oldEnv=process.env.NODE_ENV;process.env.NODE_ENV="production";
  try {assert.equal((await route.POST(new Request(request(),{headers:{"content-type":"application/json"}}),params)).status,403);}
  finally {if(oldEnv===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldEnv;}
  assert.deepEqual(state.calls,[]);assert.deepEqual(state.reads,[]);
});
test("validation stricte, auteur issu de la session, timestamp précis transmis sans perte",async()=>{
  for (const body of [null,{},[],{eventAt:"today",status:"failed"},{eventAt,status:"sent"}]) {
    assert.equal((await route.POST(request(body),params)).status,400);
  }
  assert.equal((await route.POST(request(),{params:Promise.resolve({id:"bad"})})).status,400);
  const response=await route.POST(request({eventAt,status:"failed",actorUserId:"injected"}),params);
  assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");
  assert.deepEqual(await response.json(),{handled:true});
  assert.deepEqual(state.calls,[["handle_support_email_incident",{p_delivery_id:id,p_actor_user_id:"admin",p_expected_event_at:eventAt,p_expected_status:"failed"}]]);
});
test("nouvel événement : conflit sans faux succès ; erreurs sans donnée personnelle",async()=>{
  state.rpcResult=false;assert.equal((await route.POST(request(),params)).status,409);
  state.rpcError={message:"secret@example.test"};
  const response=await route.POST(request(),params);
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/secret/);
});
test("les alertes navigation et Pilotage excluent les traités, sans changer les stocks",async()=>{
  const response=await alerts.GET();
  assert.equal((await response.json()).emailCount,1);
  const overview=await getSaasAdminOverview();
  assert.equal(overview.totals.failedRewardEmails,1);
  assert.equal(overview.users[0].failedEmailCount,1);
  assert.equal(overview.totals.lowStockPrizes,0);
  assert.equal(overview.users[0].exhaustedStockCount,1);
  state.tables.reward_email_deliveries[0].support_is_handled=true;
  assert.equal((await (await alerts.GET()).json()).emailCount,0);
  assert.equal((await getSaasAdminOverview()).totals.failedRewardEmails,0);
});
test("Supervision historique : actifs/traités, compteur exact et date conservée dans les tableaux",async()=>{
  state.tables.reward_email_deliveries.push(...Array.from({length:25},(_,i)=>({...state.tables.reward_email_deliveries[0],id:"active-"+i})));
  const overview=await getSupabaseMerchantSupportOverview({id:"site"},{includeAllMerchants:true});
  assert.equal(overview.failedEmails.length,20);
  assert.equal(overview.activeEmailCount,26);
  assert.equal(overview.handledEmails.length,1);
  assert.equal(overview.failedEmails[0].eventAt,eventAt);
  assert.equal(overview.handledEmails[0].handledAt,"2026-10-11T12:00Z");
  const render=(rows,showHandled)=>renderToStaticMarkup(SupportTables({rows,showHandled,hasFilter:false}));
  const active=render(overview,false);
  assert.equal((active.match(/<table\b/g)??[]).length,4);
  assert.match(active,/Marquer comme traité/);assert.doesNotMatch(active,/handled@example/);
  const history=render({...overview,failedEmails:overview.handledEmails},true);
  assert.match(history,/handled@example/);assert.match(history,/Traité le/);assert.doesNotMatch(history,/Marquer comme traité/);
});

test("tableaux partagés : échappement HTML, données, états vides sans mutation",async()=>{
  const rows={failedEmails:[{deliveryId:id,campaignTitle:"Jeu e-mail",leadFirstName:"Camille",recipientEmail:"player@example.test",
    status:"failed",lastEventAt:eventAt,eventAt,errorMessage:"<script>alerte</script>"}],
    webhooks:[{id:"event",createdAt:eventAt,eventType:"email.delivered",campaignTitle:"Jeu webhook",
      recipientEmail:"webhook@example.test",deliveryStatus:"delivered",summary:"Détail webhook"}],
    pendingClaims:[{leadId:"claim",campaignTitle:"Jeu gain",firstName:"Camille",email:"gain@example.test",
      prizeLabel:"Soin offert",redemptionCode:"DEMO-CODE",status:"claimed",availableAt:eventAt,expiresAt:eventAt}],
    businessLogs:[{id:"log",createdAt:eventAt,event:"demo_log",level:"warn",campaignId:"demo",leadId:"lead",
      email:"journal@example.test",redemptionCode:"DEMO-CODE",summary:"Détail journal"}]};
  const html=renderToStaticMarkup(SupportTables({rows,showHandled:false,hasFilter:false}));
  for(const value of ["player@example.test","webhook@example.test","gain@example.test","journal@example.test","DEMO-CODE","Détail journal"])
    assert.ok(html.includes(value));
  assert.ok(html.includes("&lt;script&gt;"));assert.doesNotMatch(html,/<script>/);
  const empty=renderToStaticMarkup(SupportTables({rows:{failedEmails:[],webhooks:[],pendingClaims:[],businessLogs:[]},
    showHandled:false,hasFilter:true}));
  assert.match(empty,/Aucun e-mail ne correspond/);
  assert.deepEqual(state.calls,[]);assert.deepEqual(state.reads,[]);
});
