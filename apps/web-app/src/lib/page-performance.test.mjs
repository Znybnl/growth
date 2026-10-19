import assert from "node:assert/strict";
import * as merchantLogoText from "./merchant-logo-text.ts";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { readAllRows } from "./paginated-read.ts";
const require = createRequire(import.meta.url);
const measureServerStage = (_stage, work) => work();
function load(path, dependencies = {}, globals = {}) {
  const testModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module: testModule, exports: testModule.exports, process, performance, console, Date, Map, Set, Buffer,
    require: name => dependencies[name] ?? (name.startsWith("@/") ? {} : require(name)), ...globals });
  return testModule.exports;
}
function workspace({ count = 8, cap = 500, archived = false, fail = false } = {}) {
  const ids = Array.from({length:count},(_,i)=>"site-"+i);
  const reads = [];
  const fallback = {id:ids[0],companyName:"Commerce",locationStatus:"active"};
  const db = { from(table) {
    const filters = {}; let start=0,end=Infinity;
    const q = {
      select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(){return q},
      in(k,v){filters[k]=v;return q},range(a,b){start=a;end=b;return q},
      maybeSingle(){return q},single(){return q},
      then(resolve,reject) {
        reads.push({table,filters,start});
        let data;
        if(table==="merchant_users") {
          assert.equal(filters.id,"user");
          data={id:"user",merchant_id:fallback.id,first_name:"Camille",email:"test@example.test"};
        } else if(table==="merchant_workspace_memberships") {
          assert.equal(filters.merchant_user_id,"user");
          assert.equal(filters.status,"active");
          data={id:"member",workspace_id:"workspace",role:"viewer",status:"active"};
        } else if(table==="merchant_workspaces") {
          assert.equal(filters.id,"workspace");
          data={id:"workspace",name:"Groupe",created_at:"2026-01-01"};
        } else if(table==="merchant_membership_locations") {
          assert.equal(filters.membership_id,"member");
          data=ids.map(merchant_id=>({merchant_id}));
        } else {
          assert.equal(table,"merchants");
          const requested=Array.isArray(filters.id)?filters.id:[filters.id];
          assert.ok(requested.every(id=>ids.includes(id)));
          data=requested.slice(start,Math.min(end+1,start+cap)).map(id=>({
            id,company_name:"Commerce",logo_text:"Logo",created_at:"2026-01-01",
            location_status:archived&&id===ids.at(-1)?"archived":"active",
          }));
          if(!Array.isArray(filters.id))data=data[0];
        }
        return Promise.resolve({data:fail&&table==="merchants"?null:data,
          error:fail&&table==="merchants"?{message:"private DB error"}:null,
          count:table==="merchants"?filters.id.length:undefined}).then(resolve,reject);
      },
    }; return q;
  }};
  const repo=load("./merchant-account-repository.ts",{
    "@/lib/merchant-logo-text":merchantLogoText,
    "@/lib/supabase":{getSupabaseAdmin:()=>db,isSupabaseConfigured:()=>true},
    "@/lib/server-performance":{measureServerStage},
    "@/lib/paginated-read":{readAllRows},
  });
  return {repo,fallback,reads};
}
test("#500 workspace : huit sites, une lecture groupée, rôles et archivage conservés",async()=>{
  const {repo,fallback,reads}=workspace({archived:true});
  const result=await repo.getSupabaseMerchantWorkspaceContext("user",fallback);
  assert.equal(result.locations.length,7);
  assert.ok(result.locations.every(l=>l.role==="viewer"));
  assert.equal(reads.filter(r=>r.table==="merchants").length,1);
  assert.equal(result.locations[0].merchant.id,fallback.id);
});
test("#500 session complète : six lectures, site actif autorisé, substitution étrangère ignorée",async()=>{
  for(const requested of ["site-4","foreign"]) {
    const {repo,reads}=workspace();
    const session=await repo.resolveMerchantSessionFromAuthUser({
      id:"auth",email:"test@example.test",app_metadata:{merchant_user_id:"user"},user_metadata:{},
    },requested);
    assert.equal(session.merchant.id,requested==="foreign"?"site-0":"site-4");
    assert.equal(session.user.role,"viewer");
    assert.equal(reads.length,6);
    assert.equal(reads.filter(r=>r.table==="merchant_workspace_memberships").length,1);
  }
});
test("#500 workspace : pagination sous plafond et lots bornés à 200",async()=>{
  const {repo,fallback,reads}=workspace({count:405,cap:73});
  const result=await repo.getSupabaseMerchantWorkspaceContext("user",fallback);
  assert.equal(result.locations.length,405);
  assert.equal(new Set(result.locations.map(l=>l.merchant.id)).size,405);
  assert.ok(reads.filter(r=>r.table==="merchants").every(r=>r.filters.id.length<=200));
});
test("#500 workspace : lecture défaillante ne donne pas accès à un site supplémentaire",async()=>{
  const {repo,fallback}=workspace({fail:true});
  const result=await repo.getSupabaseMerchantWorkspaceContext("user",fallback);
  assert.equal(result.locations.length,1);
  assert.equal(result.locations[0].merchant.id,fallback.id);
  assert.equal(result.locations[0].role,"viewer");
});
test("#500 alertes : agrégat lié à la session, réponse privée et erreur sans détail",async()=>{
  const calls=[];
  const repo=load("./merchant-alerts-repository.ts",{
    "@/lib/server-performance":{measureServerStage},
    "@/lib/supabase":{getSupabaseAdmin:()=>({rpc:async(name,args)=>{
      calls.push({name,args});return{data:[{email_count:3,email_campaign_id:"own",
        low_stock_count:1,exhausted_stock_count:2,stock_campaign_id:"own"}],error:null};
    }})},
  });
  const dependencies={
    "next/server":{NextResponse:{json:Response.json.bind(Response)}},
    "@/lib/auth":{requireAuthenticatedSession:async()=>({merchant:{id:"scope"}})},
    "@/lib/merchant-alerts-repository":repo,
  };
  const route=load("../app/api/merchant/email-alerts/route.ts",dependencies);
  const result=await route.GET();
  assert.equal(result.headers.get("Cache-Control"),"private, no-store");
  assert.match(result.headers.get("Server-Timing"),/^merchant-alerts;dur=/);
  assert.equal((await result.json()).emailCount,3);
  assert.equal(calls[0].name,"get_merchant_operational_alerts");
  assert.equal(calls[0].args.p_merchant_id,"scope");
  const failed=load("../app/api/merchant/email-alerts/route.ts",{...dependencies,
    "@/lib/merchant-alerts-repository":{getMerchantOperationalAlerts:async()=>{throw Error("secret@example.test SQL")}}});
  const unavailable=await failed.GET();
  assert.equal(unavailable.status,503);
  assert.doesNotMatch(await unavailable.text(),/secret|SQL|emailCount/);
  const denied=load("../app/api/merchant/email-alerts/route.ts",{...dependencies,
    "@/lib/auth":{requireAuthenticatedSession:async()=>{throw Error("Unauthorized")}}});
  await assert.rejects(()=>denied.GET(),/Unauthorized/);
  assert.equal(calls.length,1);
});
test("#500 timings : résultat/erreur préservés, données exclues, désactivation",async()=>{
  const entries=[];
  const env={NODE_ENV:"production"};
  const {measureServerStage:measure}=load("./server-performance.ts",{},{
    process:{env},console:{info:value=>entries.push(JSON.parse(value))},
  });
  const value={email:"private@example.test",url:"private-image"};
  assert.equal(await measure("page.home",async()=>value),value);
  const failure=Error("private DB failure");
  await assert.rejects(()=>measure("data.overview",async()=>{throw failure}),error=>error===failure);
  assert.equal(entries.length,2);
  assert.deepEqual(Object.keys(entries[0]).sort(),["durationMs","event","stage","success"]);
  assert.equal(entries[1].success,false);
  assert.doesNotMatch(JSON.stringify(entries),/private|example|failure/);
  env.OKADO_PERFORMANCE_LOGS="false";
  await measure("page.home",async()=>value);
  assert.equal(entries.length,2);
});

test("#500 Résultats : projection JSON des conditions, pagination et opt-ins conservés",async()=>{
  const selections=[];
  const campaign={id:"c",merchant_id:"m",title:"Test",game_type:"wheel",created_at:"2026-01-01"};
  const metrics={campaign_id:"c",opt_ins:9,undated_redemptions:2,scans_count:100,games_count:12,
    leads_count:11,wins_count:10,redeemed_count:3,actions_count:14,estimated_spend:20};
  function query(data,table) {
    const q={select(columns){selections.push({table,columns});return q},eq(){return q},
      order(){return q},limit(){return q},range(){return q},maybeSingle(){return q},
      then(resolve,reject){return Promise.resolve({data,count:Array.isArray(data)?data.length:undefined,error:null}).then(resolve,reject)}};
    return q;
  }
  const db={rpc(name) {
    if(name==="get_merchant_page_overview")return query([{campaign_id:"c",campaign,metrics,pending_redemptions:[]}],name);
    assert.equal(name,"get_campaign_data_summary");
    return query([{...metrics,daily_stats:[],action_volumes:[]}],name);
  },from(table){
    if(table==="campaigns")return query({prizeSettings:{p:{usageConditions:"Avec un soin"}}},table);
    return query(table==="prizes"?[{id:"p",campaign_id:"c",label:"Lot",remaining_quantity:null,total_quantity:null}]:[],table);
  }};
  const repo=load("./campaign-repository.ts",{
    "@/lib/merchant-logo-text":merchantLogoText,
    "@/lib/server-performance":{measureServerStage},
    "@/lib/paginated-read":{readAllRows},
    "@/lib/supabase":{getSupabaseAdmin:()=>db,unwrapSupabaseResult:r=>{if(r.error)throw Error("Unavailable");return r.data},
      assertSupabaseResult:r=>{if(r.error)throw Error("Unavailable")}},
    "@/lib/participation-metrics":{participationDates:()=>[]},
    "@/lib/metric-rules":{conversionRate:(games,scans)=>scans?Math.round(games/scans*100):0},
    "@/lib/campaign-defaults":{defaultWheelSubtitleSpacingForTemplate:()=>0},
    "@/lib/poster-utils":{resolvePosterLogoSettings:v=>v,normalizePosterSettings:(v,d)=>d,createPosterSettingsDefaults:()=>({})},
    "@/lib/email-settings":{normalizeCampaignEmailSettings:(v,d)=>d,createCampaignEmailDefaults:()=>({})},
  });
  const result=await repo.getSupabaseCampaignDataView("c",{id:"m",companyName:"Commerce fictif"},{leadOffset:50,leadLimit:50});
  assert.equal(result.performance.kpis.optIns,9);
  assert.equal(result.performance.kpis.games,12);
  assert.equal(result.undatedRedemptions,2);
  assert.equal(result.leadOffset,50);
  assert.equal(result.performance.prizes[0].usageConditions,"Avec un soin");
  assert.equal(selections.find(r=>r.table==="campaigns").columns,"prizeSettings:campaign_local_settings->prizeSettings");
});
