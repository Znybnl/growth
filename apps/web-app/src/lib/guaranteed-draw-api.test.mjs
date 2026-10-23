import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { selectGuaranteedPrize } from "./guaranteed-draw.ts";
const require=createRequire(import.meta.url);
function load(relative, dependencies={}) {
  const mod={exports:{}};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(relative,import.meta.url),"utf8"),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{module:mod,exports:mod.exports,process,Buffer,Date,Math,Map,Set,Error,performance,
    require:name=>name in dependencies ? dependencies[name] : require(name)});
  return mod.exports;
}
test("vrai handler : refus sans session/événement/cookie et verrou quotidien libéré",async()=>{
  const state={sessions:0,events:0,claimed:0,released:0};
  const api=load("./public-api.ts");
  const route=load("../app/api/public/draw/session/route.ts",{
    "next/server":{NextResponse:{json:Response.json.bind(Response)}},
    "@/lib/public-api":api,
    "@/lib/store":{
      getPublicCampaign:async()=>({actions:[],googleClickRequired:false}),
      createDrawSession:async()=>{ selectGuaranteedPrize([{probability:0,remainingQuantity:null}]); state.sessions++; },
      createPreviewDrawSession:async()=>{throw Error("prévisualisation inattendue");},
    },
    "@/lib/google-click-policy":{requiresGoogleClick:()=>false},
    "@/lib/preview-token":{verifyPreviewAccessToken:()=>null,issuePreviewSessionToken:()=>{throw Error("jeton inattendu");}},
    "@/lib/participation-token":{publicPlayerToken:()=>null,issueParticipationToken:()=>{throw Error("jeton inattendu");}},
    "@/lib/public-security-store":{assertPersistentPublicRateLimit:async()=>{},
      assertPersistentDailyParticipationLock:async()=>{state.claimed++;},
      releasePersistentDailyParticipationLock:async()=>{state.released++;}},
    "@/lib/product-analytics":{captureProductEvent:async()=>{state.events++;}},
    "@/lib/support-log":{logSupportEvent:()=>{}},
  });
  const request=new Request("https://app.example.test/api/public/draw/session",{method:"POST",body:JSON.stringify({campaignId:"fixture"})});
  request.cookies={get:()=>undefined};
  const response=await route.POST(request);
  assert.equal(response.status,400);
  assert.match((await response.json()).error,/Aucun lot disponible/);
  assert.equal(response.headers.get("set-cookie"),null);
  assert.deepEqual(state,{sessions:0,events:0,claimed:1,released:1});
});
