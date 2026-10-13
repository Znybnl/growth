import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relative, dependencies = {}) {
  const testModule = {exports:{}};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(relative,import.meta.url),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{module:testModule,exports:testModule.exports,process,Buffer,Date,Map,Set,Error,performance,
    require:name=>name in dependencies ? dependencies[name] : require(name)});
  return testModule.exports;
}
const tokens=load("./participation-token.ts");
const publicApi=load("./public-api.ts");
function handler({recorded=true,error=null}={}) {
  const state={calls:[],limits:[]};
  const route=load("../app/api/public/draw/played/route.ts",{
    "next/server":{NextResponse:{json:Response.json.bind(Response)}},
    "@/lib/public-api":publicApi,"@/lib/participation-token":tokens,
    "@/lib/support-log":{logSupportEvent:()=>{}},
    "@/lib/public-security-store":{assertPersistentPublicRateLimit:async(r,o)=>state.limits.push(o)},
    "@/lib/store":{recordDrawSessionParticipation:async(c,s)=>{
      state.calls.push([c,s]); if(error)throw error; return recorded;
    }},
  });
  return {state,POST:route.POST};
}
const token=tokens.issueParticipationToken("campaign-test","session-test",new Date(Date.now()+60000).toISOString());
const body={campaignId:"campaign-test",sessionId:"session-test",token};
const request=b=>new Request("https://example.test/api/public/draw/played",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b),
});
test("vrai handler : partie anonyme enregistrée, contrat client, absence de coordonnées et cache privé",async()=>{
  const {state,POST}=handler();
  const result=await POST(request(body));
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{recorded:true});
  assert.equal(result.headers.get("Cache-Control"),"no-store");
  assert.deepEqual(state.calls,[["campaign-test","session-test"]]);
  assert.equal(state.limits.length,1);
});
test("faux token, contexte étranger, prévisualisation, body invalide refusés avant accès base",async()=>{
  const {state,POST}=handler();
  for(const b of [null,{}, {...body,token:"fake"}, {...body,campaignId:"other-campaign"},
    {...body,sessionId:"other-session"}, {...body,token:"preview-token"}, {...body,token:123}]) {
    const result=await POST(request(b));assert.ok([400,403].includes(result.status));
  }
  assert.deepEqual(state.calls,[]);assert.deepEqual(state.limits,[]);
});
test("session expirée/brouillon absente et échec base ne deviennent pas un faux succès",async()=>{
  assert.equal((await handler({recorded:false}).POST(request(body))).status,409);
  const response=await handler({error:new Error("Private database detail")}).POST(request(body));
  assert.equal(response.status,503);
  assert.doesNotMatch(await response.text(),/Private database detail/);
});
test("le endpoint d'événements publics ne permet toujours pas d'inventer une partie",()=>{
  assert.equal(publicApi.isAllowedPublicEventType("game_played"),false);
  assert.equal(publicApi.isAllowedPublicEventType("game_lost"),true);
});
