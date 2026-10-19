import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as rules from "./metric-rules.ts";
import { readAllRows } from "./paginated-read.ts";
import * as merchantLogoText from "./merchant-logo-text.ts";
const require=createRequire(import.meta.url);
function load(relative,dependencies={}) {
  const testModule={exports:{}};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(relative,import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{module:testModule,exports:testModule.exports,process,Buffer,Date,Map,Set,Error,performance,crypto:globalThis.crypto,
    require:name=>name in dependencies?dependencies[name]:name.startsWith('@/')?{}:require(name)});
  return testModule.exports;
}
function query(rows=[], error=null) {
  let from=0,to=Infinity;const q={
    select(){return q},eq(){return q},in(){return q},not(){return q},order(){return q},limit(){return q},
    range(a,b){from=a;to=b;return q},
    then(resolve,reject){return Promise.resolve({data:rows.slice(from,to+1),count:rows.length,error}).then(resolve,reject)},
  };return q;
}
const response={json:Response.json.bind(Response)};
const unwrap=r=>{if(r.error)throw Error('Unavailable');return r.data};
function repository({error=null}={}) {
  const db={
    rpc(name){
      if(name==='get_merchant_page_overview')return query([{campaign_id:'c',
        campaign:{id:'c',merchant_id:'m',title:'Fictif',game_type:'wheel',created_at:'2026-01-01'},
        metrics:{campaign_id:'c',opt_ins:1,undated_redemptions:0,
          scans_count:100,games_count:2,leads_count:1,wins_count:1,redeemed_count:0,actions_count:2,estimated_spend:4},
        pending_redemptions:[{prizeId:'p',count:3}]}],error);
      if(name==='get_merchant_participation_activity')return query([]);
      throw Error('Unexpected RPC '+name);
    },
    from(table){if(table==='prizes')return query([{id:'p',campaign_id:'c',label:'Lot',remaining_quantity:2,total_quantity:10}]);throw Error('Unexpected read '+table)},
  };
  return load('./campaign-repository.ts',{
    '@/lib/merchant-logo-text':merchantLogoText,
    '@/lib/server-performance':{measureServerStage:(_stage,work)=>work()},
    '@/lib/metric-rules':rules,'@/lib/paginated-read':{readAllRows},
    '@/lib/supabase':{getSupabaseAdmin:()=>db,unwrapSupabaseResult:unwrap},
    '@/lib/campaign-defaults':{defaultWheelSubtitleSpacingForTemplate:()=>0},
    '@/lib/poster-utils':{resolvePosterLogoSettings:v=>v,normalizePosterSettings:(v,d)=>d,createPosterSettingsDefaults:()=>({})},
    '@/lib/email-settings':{normalizeCampaignEmailSettings:(v,d)=>d,createCampaignEmailDefaults:()=>({})},
  });
}
test('vrai repository dashboard : opt-ins exacts, attente agrégée, clics et conversion',async()=>{
  const result=await repository().getSupabaseMerchantDashboard({id:'m',companyName:'Commerce fictif'});
  assert.equal(result.campaigns[0].kpis.optIns,1);
  assert.equal(result.campaigns[0].kpis.actions,2);
  assert.equal(result.averageConversion,2);
  assert.equal(result.prizeInventory[0].pendingRedemptions,3);
  assert.equal('actionRate' in result.campaigns[0].kpis,false);
});
test('vrai repository : échec des métriques ne devient pas un zéro fabriqué',async()=>{
  await assert.rejects(()=>repository({error:{message:'database error'}}).getSupabaseMerchantDashboard({id:'m'}));
});

test('#500 sélecteur de campagnes : DTO sans configuration ni image',async()=>{
  const [campaign]=await repository().getSupabaseMerchantCampaignLibrary('m');
  assert.deepEqual(Object.keys(campaign).sort(),
    ['createdAt','gameType','id','isActive','participations','scans','title']);
  assert.equal(campaign.participations,2);
});

test('#500 Résultats : campagne étrangère refusée avant contacts ou configuration',async()=>{
  const result=await repository().getSupabaseCampaignDataView('foreign',{id:'m'});
  assert.equal(result,null);
});
test('export paginé : identifiant de jeu étranger refusé avant lecture des contacts',async()=>{
  const reads=[];
  const db={from:table=>{reads.push(table);assert.equal(table,'campaigns');return query([{id:'own',title:'Fictif',merchant_id:'m'}]);}};
  const repo=load('./campaign-repository.ts',{'@/lib/paginated-read':{readAllRows},
    '@/lib/supabase':{getSupabaseAdmin:()=>db,unwrapSupabaseResult:unwrap}});
  const result=await repo.getSupabaseMerchantLeads('m','foreign');
  assert.equal(result.length,0);assert.deepEqual(reads,['campaigns']);
});
test('vrai handler stats transmet les opt-ins et la conversion du dashboard',async()=>{
  const dashboard=await repository().getSupabaseMerchantDashboard({id:'m',companyName:'Commerce fictif'});
  const route=load('../app/api/merchant/stats/route.ts',{
    'next/server':{NextResponse:response},'@/lib/auth':{requireAuthenticatedSession:async()=>({merchant:{id:'m'}})},
    '@/lib/store':{getMerchantDashboard:async()=>dashboard},
  });
  const json=await (await route.GET()).json();assert.equal(json.campaigns[0].kpis.optIns,1);assert.equal(json.averageConversion,2);
});
test('erreur SQL de clic : indisponibilité sans détail privé dans le message public',async()=>{
  const db={rpc:async()=>({data:null,error:{code:'PGRST202',message:'private@example.test secret schema'}})};
  const repo=load('./campaign-repository.ts',{'@/lib/metric-rules':rules,'@/lib/supabase':{getSupabaseAdmin:()=>db}});
  await assert.rejects(()=>repo.recordEventInSupabase('c','social_clicked',undefined,{actionId:'action',eventId:'click'}),
    error=>error.status===503 && !/private|secret/.test(error.message));
});
test('vrai Pilotage : essais applicatifs inclus, unité établissement, aucun appel Stripe',async()=>{
  const merchants=[{id:'m',stripe_subscription_status:null,trial_end_date:new Date(Date.now()+86400000).toISOString()},
    {id:'subscribed',stripe_subscription_status:'active',trial_end_date:null},
    {id:'expired',stripe_subscription_status:null,trial_end_date:new Date(Date.now()-86400000).toISOString()}];
  const db={from:table=>query(table==='merchants'?merchants:[]),
    rpc:name=>{assert.equal(name,'get_platform_operational_metrics');return query([{merchant_id:'m',contacts:1203,pending_rewards:5,low_stock:0,exhausted_stock:1,failed_emails:0}]);}};
  const repo=load('./admin-repository.ts',{
    '@/lib/paginated-read':{readAllRows},'@/lib/metric-rules':rules,'@/lib/supabase':{getSupabaseAdmin:()=>db},
    '@/lib/stripe':{getStripeClient:()=>{throw Error('Unexpected Stripe call')}},
  });
  const result=await repo.getSaasAdminOverview();
  assert.equal(result.totals.activeSubscriptions,2);assert.equal(result.totals.pendingRewards,5);
  assert.equal(result.totals.leads,1203);assert.equal(result.totals.lowStockPrizes,0);
});
test('vrai handler public : action étrangère ou type falsifié refusé, legacy accepté sans fabriquer de partie',async()=>{
  const api=load('./public-api.ts');let calls=0;
  const route=load('../app/api/public/event/route.ts',{
    'next/server':{NextResponse:response},'@/lib/public-api':api,
    '@/lib/public-security-store':{assertPersistentPublicRateLimit:async()=>{}},
    '@/lib/store':{getPublicCampaign:async()=>({actions:[{id:'action-test',kind:'instagram'}]}),recordEvent:async()=>{calls++;return {id:'event'}}},
  });
  const request=body=>new Request('https://example.test/api/public/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const base={campaignId:'campaign-test',eventType:'social_clicked',metadata:{actionId:'action-test',eventId:'click-test'}};
  assert.equal((await route.POST(request(null))).status,400);
  assert.equal((await route.POST(request({...base,metadata:{...base.metadata,actionId:'foreign'}}))).status,400);
  assert.equal((await route.POST(request({...base,eventType:'review_clicked'}))).status,400);
  assert.equal((await route.POST(request({...base,metadata:{...base.metadata,eventId:123}}))).status,400);
  assert.equal(calls,0);
  assert.equal((await route.POST(request(base))).status,201);
  assert.equal((await route.POST(request({campaignId:'campaign-test',eventType:'social_clicked'}))).status,201);
  assert.equal((await route.POST(request({...base,eventType:'game_played'}))).status,400);
  assert.equal(calls,2);
});
