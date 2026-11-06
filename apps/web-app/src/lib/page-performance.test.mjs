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
function workspace({ count = 8, cap = 500, archived = false, fail = false, hold = async () => {}, legacy = false, profileName = () => "Commerce" } = {}) {
  const ids = Array.from({length:count},(_,i)=>"site-"+i);
  const reads = [];
  const repairs = [];
  const fallback = {id:ids[0],companyName:"Commerce",locationStatus:"active"};
  const db = { auth:{admin:{updateUserById:async(id,payload)=>{repairs.push({id,payload});return {error:null}}}}, from(table) {
    const filters = {}; let start=0,end=Infinity,embeddedLimit=Infinity;
    const q = {
      select(){return q},eq(k,v){filters[k]=v;return q},order(){return q},limit(value,options){if(options?.referencedTable==="locations")embeddedLimit=value;return q},
      in(k,v){filters[k]=v;return q},range(a,b){start=a;end=b;return q},
      maybeSingle(){return q},single(){return q},overrideTypes(){return q},
      async then(resolve,reject) {
        reads.push({table,filters,start});
        await hold(table);
        const profile = id => ({id,company_name:profileName(),logo_text:"Logo",created_at:"2026-01-01",
          location_status:archived&&id===ids.at(-1)?"archived":"active"});
        let data;
        if(table==="merchant_users") {
          assert.ok(filters.id === "user" || filters.email === "test@example.test" || filters.id === "stale");
          data=legacy&&filters.id?null:{id:"user",merchant_id:fallback.id,first_name:"Camille",email:"test@example.test",
            merchant:profile(fallback.id)};
        } else if(table==="merchant_workspace_memberships") {
          assert.ok(["user","stale"].includes(filters.merchant_user_id));
          assert.equal(filters.status,"active");
          const foreign=filters.merchant_user_id==="stale";
          const allowedIds=foreign?["foreign"]:ids;
          data={id:foreign?"foreign-member":"member",role:foreign?"owner":"viewer",
            workspace:{id:foreign?"foreign-workspace":"workspace",name:"Groupe",created_at:"2026-01-01"},
            locations:fail?[]:allowedIds.slice(0,Math.min(embeddedLimit,cap))
              .map(merchant_id=>({merchant_id,merchant:profile(merchant_id)})),
            location_count:[{count:allowedIds.length}]};
        } else if(table==="merchant_membership_locations") {
          assert.equal(filters.membership_id,"member");
          data=fail?null:ids.slice(start,Math.min(end+1,start+cap))
            .map(merchant_id=>({merchant_id,merchant:profile(merchant_id)}));
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
          error:fail&&["merchants","merchant_membership_locations"].includes(table)?{message:"private DB error"}:null,
          count:table==="merchant_membership_locations"?ids.length:table==="merchants"?filters.id.length:undefined}).then(resolve,reject);
      },
    }; return q;
  }};
  const repo=load("./merchant-account-repository.ts",{
    "@/lib/merchant-logo-text":merchantLogoText,
    "@/lib/supabase":{getSupabaseAdmin:()=>db,isSupabaseConfigured:()=>true},
    "@/lib/server-performance":{measureServerStage},
    "@/lib/paginated-read":{readAllRows},
  });
  return {repo,fallback,reads,repairs};
}
test("#743 workspace : profils joints aux sites autorisés, rôles et archivage conservés",async()=>{
  const {repo,fallback,reads}=workspace({archived:true});
  const result=await repo.getSupabaseMerchantWorkspaceContext("user",fallback);
  assert.equal(result.locations.length,7);
  assert.ok(result.locations.every(l=>l.role==="viewer"));
  assert.equal(reads.filter(r=>r.table==="merchants").length,0);
  assert.equal(result.locations[0].merchant.id,fallback.id);
});
test("#500 session complète : deux lectures, site actif autorisé, substitution étrangère ignorée",async()=>{
  for(const requested of ["site-4","foreign"]) {
    const {repo,reads}=workspace();
    const session=await repo.resolveMerchantSessionFromAuthUser({
      id:"auth",email:"test@example.test",app_metadata:{merchant_user_id:"user"},user_metadata:{},
    },requested);
    assert.equal(session.merchant.id,requested==="foreign"?"site-0":"site-4");
    assert.equal(session.user.role,"viewer");
    assert.equal(reads.length,2);
    assert.equal(session.user.workspaceId,"workspace");
    assert.equal(reads.filter(r=>r.table==="merchant_workspace_memberships").length,1);
  }
});
test("#500 workspace : pagination des profils joints sous plafond",async()=>{
  const {repo,fallback,reads}=workspace({count:405,cap:73});
  const result=await repo.getSupabaseMerchantWorkspaceContext("user",fallback);
  assert.equal(result.locations.length,405);
  assert.equal(new Set(result.locations.map(l=>l.merchant.id)).size,405);
  assert.equal(reads.filter(r=>r.table==="merchant_membership_locations").length,6);
});
test("#753 workspace : le plafond des relations imbriquées ne tronque pas les sites autorisés", async () => {
  const {repo,fallback,reads}=workspace({count:8,cap:3});
  const result=await repo.getSupabaseMerchantWorkspaceContext("user",fallback);
  assert.equal(result.locations.length,8);
  assert.equal(reads.filter(r=>r.table==="merchant_membership_locations").length,3);
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
  let releaseSummary;
  const pendingSummary = new Promise(resolve => { releaseSummary = resolve; });
  let releaseContacts;
  const pendingContacts = new Promise(resolve => { releaseContacts = resolve; });
  const campaign={id:"c",merchant_id:"m",title:"Test",game_type:"wheel",created_at:"2026-01-01"};
  const metrics={campaign_id:"c",opt_ins:9,undated_redemptions:2,scans_count:100,games_count:12,
    leads_count:11,wins_count:10,redeemed_count:3,actions_count:14,estimated_spend:20};
  function query(data,table) {
    const q={select(columns){selections.push({table,columns});return q},eq(){return q},
      order(){return q},limit(){return q},range(){return q},maybeSingle(){return q},
      async then(resolve,reject){if(table==="leads") await pendingContacts;if(table==="get_campaign_data_summary") await pendingSummary;return Promise.resolve({data,count:Array.isArray(data)?data.length:undefined,error:null}).then(resolve,reject)}};
    return q;
  }
  const db={rpc(name) {
    if(name==="get_merchant_page_overview")return query([{campaign_id:"c",campaign,metrics,pending_redemptions:[]}],name);
    assert.equal(name,"get_campaign_data_summary");
    return query([{...metrics,games_count:13,daily_stats:[],action_volumes:[]}],name);
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
  const pendingResult=repo.getSupabaseCampaignResults("c",{id:"m",companyName:"Commerce fictif"},{leadOffset:50,leadLimit:50});
  const kpis=await repo.getSupabaseResultsKpis("m","c");
  assert.equal(kpis.games,12);
  assert.equal(kpis.optIns,9);
  releaseSummary();
  const result=await pendingResult;
  assert.equal(result.performance.kpis.optIns,9);
  assert.equal(result.performance.kpis.games,12);
  assert.equal(result.undatedRedemptions,2);
  assert.equal(selections.find(r=>r.table==="get_merchant_page_overview").columns,"campaign_id,campaign,metrics");
  releaseContacts();
  assert.equal((await result.contacts).leadOffset,50);
  assert.equal(result.performance.prizes[0].usageConditions,"Avec un soin");
  assert.equal(selections.find(r=>r.table==="campaigns").columns,"prizeSettings:campaign_local_settings->prizeSettings");
});


test("#743 session : les lectures utilisateur et adhésion démarrent ensemble", async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const {repo,reads}=workspace({hold:table=>["merchant_users","merchant_workspace_memberships"].includes(table)?gate:undefined});
  const pending=repo.resolveMerchantSessionFromAuthUser({id:"auth",app_metadata:{merchant_user_id:"user"},user_metadata:{}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(reads.map(r=>r.table).sort(),["merchant_users","merchant_workspace_memberships"]);
  release();
  assert.equal((await pending).merchant.id,"site-0");
});

test("#743 session : rapprochement par e-mail, droits relus pour le bon utilisateur", async () => {
  const {repo,reads,repairs}=workspace({legacy:true});
  const session=await repo.resolveMerchantSessionFromAuthUser({id:"auth",email:"TEST@example.test",app_metadata:{merchant_user_id:"stale"},user_metadata:{}});
  assert.equal(session.user.id,"user");
  assert.equal(session.user.role,"viewer");
  assert.equal(session.locations.length,8);
  assert.deepEqual(reads.filter(r=>r.table==="merchant_workspace_memberships").map(r=>r.filters.merchant_user_id),["stale","user"]);
  assert.equal(session.user.workspaceId,"workspace");
  assert.ok(session.locations.every(location=>location.merchant.id!=="foreign"));
  assert.equal(repairs[0].id,"auth");
  assert.equal(repairs[0].payload.app_metadata.merchant_user_id,"user");
});

test("#743 session : une navigation suivante relit les profils sans cache partagé", async () => {
  let name="Avant";
  const {repo}=workspace({profileName:()=>name});
  const auth={id:"auth",app_metadata:{merchant_user_id:"user"},user_metadata:{}};
  assert.equal((await repo.resolveMerchantSessionFromAuthUser(auth)).merchant.companyName,"Avant");
  name="Après";
  assert.equal((await repo.resolveMerchantSessionFromAuthUser(auth)).merchant.companyName,"Après");
});

test("#743 campagnes : lots et agrégats démarrent ensemble avec le même périmètre marchand", async () => {
  let release;
  const gate=new Promise(resolve=>{release=resolve});
  const calls=[];
  function result(source) {
    const q={select(columns){assert.match(columns,/campaign:campaigns!inner\(merchant_id\)/);return q},
      eq(key,value){assert.equal(key,"campaign.merchant_id");assert.equal(value,"own");return q},
      order(){return q},range(){return q},
      async then(resolve,reject){calls.push(source);await gate;return Promise.resolve({data:[],count:0,error:null}).then(resolve,reject)}};
    return q;
  }
  const db={from(table){assert.equal(table,"prizes");return result("prizes")},
    rpc(name,args){assert.equal(name,"get_merchant_page_overview");assert.equal(args.p_merchant_id,"own");return result("overview")}};
  const repo=load("./campaign-repository.ts",{
    "react":{cache:fn=>fn},
    "@/lib/server-performance":{measureServerStage},
    "@/lib/paginated-read":{readAllRows},
    "@/lib/supabase":{getSupabaseAdmin:()=>db,unwrapSupabaseResult:r=>{assert.equal(r.error,null);return r.data}},
    "@/lib/metric-rules":{globalConversion:()=>0},
  });
  const pending=repo.getSupabaseMerchantCampaignOverview({id:"own"});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls.sort(),["overview","prizes"]);
  release();
  assert.equal((await pending).campaigns.length,0);
});


test("#747 : les contacts récents utilisent une lecture limitée au site et conservent les libellés historiques", async () => {
  const queries = [];
  const rows = [
    { id: "snapshot", prize_id: "p", prize_label_snapshot: "Soin historique", prize: { label: "Soin actuel", campaign_id: "c" } },
    { id: "current", prize_id: "p", prize: { label: "Soin actuel", campaign_id: "c" } },
    { id: "foreign-prize", prize_id: "other", prize: { label: "Donnée étrangère", campaign_id: "other" } },
    { id: "lost", prize_id: null, prize: null },
  ].map((row) => ({
    campaign_id: "c", campaign: { title: "Jeu fictif" }, first_name: "Camille",
    email: "camille@example.test", status: "claimed", created_at: "2026-11-06", ...row,
  }));
  const query = {
    select(fields) { queries.push(["select", fields]); return query; },
    eq(field, value) { queries.push(["eq", field, value]); return query; },
    order() { return query; },
    limit(value) { queries.push(["limit", value]); return query; },
    or(value) { queries.push(["or", value]); return query; },
    async overrideTypes() { return { data: rows, error: null }; },
  };
  const repo = load("./campaign-repository.ts", {
    react: { cache: (fn) => fn },
    "@/lib/supabase": {
      getSupabaseAdmin: () => ({
        from(table) { assert.equal(table, "leads"); return query; },
        rpc() { assert.fail("Contacts must not read campaign aggregates"); },
      }),
      unwrapSupabaseResult: (result) => result.data,
    },
  });

  const contacts = await repo.getSupabaseMerchantRecentLeads("site", 5);
  assert.deepEqual(Array.from(contacts, (row) => row.prizeLabel),
    ["Soin historique", "Soin actuel", "Lot inconnu", "Perdu"]);
  assert.deepEqual(queries[1], ["eq", "campaign.merchant_id", "site"]);
  assert.match(queries[0][1], /leads_campaign_id_fkey!inner/);
  assert.doesNotMatch(queries[0][1], /phone|consent|redemption_code|email_deliveries/);
  assert.deepEqual(queries[2], ["limit", 5]);
  assert.equal((await repo.getSupabaseMerchantRecentLeads("site", 2, "Camille")).length, 2);
  assert.equal((await repo.getSupabaseMerchantRecentLeads("site", 5, "aucune correspondance")).length, 0);
});


test("#747 : le replay utilise l’identité Auth vérifiée et résout le compte historique si nécessaire", async () => {
  const identity = { id: "user", merchantId: "site-0" };
  for (const mode of ["linked", "legacy", "stale", "anonymous", "expired"]) {
    const reads = [];
    const authUser = {
      id: "auth",
      app_metadata: mode === "legacy" ? {} : { merchant_user_id: "user" },
    };
    const auth = load("./auth.ts", {
      react: { cache: (fn) => fn },
      "next/navigation": {},
      "next/headers": { cookies: async () => ({
        get: (name) => name === "started" && mode === "expired" ? { value: "1" } : undefined,
      }) },
      "@/lib/session-security": {
        SESSION_STARTED_COOKIE: "started", SESSION_LAST_ACTIVITY_COOKIE: "activity",
        SESSION_MAX_AGE_MS: 90 * 86400000, SESSION_INACTIVITY_MS: 30 * 86400000,
      },
      "@/lib/server-performance": { measureServerStage },
      "@/lib/supabase-server": { createAppRouterSupabaseServerClient: async () => ({
        auth: { getUser: async () => {
          reads.push("auth");
          return { data: { user: mode === "anonymous" ? null : authUser } };
        } },
      }) },
      "@/lib/merchant-account-repository": {
        readMerchantReplayIdentity: async (id) => {
          assert.equal(id, "user");
          reads.push("identity");
          return mode === "stale" ? null : identity;
        },
        resolveMerchantSessionFromAuthUser: async (user) => {
          assert.equal(user, authUser);
          reads.push("legacy");
          return { user: identity };
        },
      },
    }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: "fixture", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture" } } });
    assert.equal(await auth.getAuthenticatedReplayIdentity(),
      ["anonymous", "expired"].includes(mode) ? null : identity);
    assert.deepEqual(reads, {
      linked: ["auth", "identity"],
      legacy: ["auth", "legacy"],
      stale: ["auth", "identity", "legacy"],
      anonymous: ["auth"],
      expired: [],
    }[mode]);
  }
});

test("#748 : la liste garde les indicateurs canoniques et rejette une ligne d’un autre établissement", async () => {
  const row = {
    campaign_id: "own-game", merchant_id: "own", metrics_id: "own-game", title: "Jeu",
    subtitle: "Sous-titre", game_type: "scratch", is_active: "false", created_at: "2026-11-06",
    games: "12", wins: "4", redeemed: "2",
  };
  let rows = [row];
  const query = {
    select(columns) {
      assert.match(columns, /games:metrics->>games_count/);
      assert.doesNotMatch(columns, /pending_redemptions|prize_id|logo/);
      return query;
    },
    order() { return query; },
    range() { return query; },
    async overrideTypes() { return { data: rows, count: rows.length, error: null }; },
  };
  const repo = load("./campaign-repository.ts", {
    react: { cache: (fn) => fn },
    "@/lib/server-performance": { measureServerStage },
    "@/lib/paginated-read": { readAllRows },
    "@/lib/supabase": {
      getSupabaseAdmin: () => ({
        from() { assert.fail("La liste n’a pas besoin de lire les lots"); },
        rpc(name, args) {
          assert.equal(name, "get_merchant_page_overview");
          assert.equal(args.p_merchant_id, "own");
          return query;
        },
      }),
      unwrapSupabaseResult: (result) => result.data,
    },
  });
  const [item] = await repo.getSupabaseMerchantCampaignList("own");
  assert.deepEqual({ ...item }, {
    id: "own-game", title: "Jeu", subtitle: "Sous-titre", gameType: "scratch", isActive: false,
    games: 12, wins: 4, redeemed: 2,
  });
  rows = [{ ...row, merchant_id: "foreign" }];
  await assert.rejects(repo.getSupabaseMerchantCampaignList("own"), /indicateurs sont incomplets/);
});
