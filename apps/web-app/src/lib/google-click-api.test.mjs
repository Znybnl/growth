import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as tokens from './participation-token.ts';
import * as policy from './google-click-policy.ts';

function load(path,dependencies) {
  const mod={exports:{}};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText,{module:mod,exports:mod.exports,performance,Date,Request,Response,
    require:name=>{if(!(name in dependencies))throw Error('Unexpected dependency '+name);return dependencies[name];}});
  return mod.exports;
}
const request=body=>({json:async()=>body,headers:new Headers(),cookies:{get:()=>undefined}});

test('vrai handler session : Google requis contrôlé avant le tirage, receipt signée et autres actions libres',async()=>{
  let kind='google',preview=false; const starts=[];
  const campaign={id:'campaign',gameType:'wheel',googleClickRequired:true,actions:[{id:'action',kind}],rewardRules:{participationIntervalDays:1}};
  const route=load('../app/api/public/draw/session/route.ts',{
    'next/server':{NextResponse:{json:(body,options)=>Object.assign(Response.json(body,options),{cookies:{set(){}}})}},
    '@/lib/public-api':{isValidPublicIdentifier:()=>true,assertDailyParticipationCookie(){},getDailyParticipationCookieName:()=>'',
      getDailyParticipationCookieOptions:()=>({}),getDailyParticipationCookieValue:()=>'',getPublicErrorStatus:()=>400,getPublicRetryAfter(){},isDailyParticipationError:()=>false},
    '@/lib/public-security-store':{assertPersistentPublicRateLimit:async()=>{},assertPersistentDailyParticipationLock:async()=>{},releasePersistentDailyParticipationLock:async()=>{}},
    '@/lib/product-analytics':{captureProductEvent:async()=>{}},
    '@/lib/store':{getPublicCampaign:async()=>({...campaign,actions:[{id:'action',kind}]}),
      createDrawSession:async input=>{starts.push(input);return {campaign,session:{id:'session',expiresAt:new Date(Date.now()+10000).toISOString()},prize:null};},
      createPreviewDrawSession:async()=>({session:{id:'preview'},prize:null})},
    '@/lib/preview-token':{verifyPreviewAccessToken:()=>preview,issuePreviewSessionToken:()=> 'preview-token'},
    '@/lib/support-log':{logSupportEvent(){}},'@/lib/participation-token':tokens,'@/lib/google-click-policy':policy,
  });
  let response=await route.POST(request({campaignId:'campaign',marketingClickEventId:'forged'}));
  assert.equal(response.status,403); assert.equal(starts.length,0);
  response=await route.POST(request({campaignId:'campaign',marketingClickToken:tokens.issueMarketingClickToken('foreign','click','action')}));
  assert.equal(response.status,403); assert.equal(starts.length,0);
  response=await route.POST(request({campaignId:'campaign',marketingClickToken:tokens.issueMarketingClickToken('campaign','click','action'),marketingClickEventId:'forged'}));
  assert.equal(response.status,201); assert.equal(starts[0].marketingClickEventId,'click'); assert.equal(starts[0].proposedActionId,'action');
  kind='instagram';
  assert.equal((await route.POST(request({campaignId:'campaign'}))).status,201);
  assert.equal(starts[1].marketingClickEventId,undefined);
  preview=true;
  assert.equal((await route.POST(request({campaignId:'campaign',previewToken:'valid-preview'}))).status,201);
  assert.equal(starts.length,2,'la preview ne déclenche pas de partie réelle');
});

test('vrai handler acceptation : session, origine, site autorisé et version requises avant insertion',async()=>{
  let session=null, trusted=true; const accepted=[];
  const route=load('../app/api/merchant/google-click-acceptance/route.ts',{
    '@/lib/auth':{getAuthenticatedSession:async()=>session},
    '@/lib/admin':{isSaasAdminEmail:()=>false},'@/lib/admin-campaign-repository':{getAdminCampaignLocation:async()=>null},
    '@/lib/request-security':{assertTrustedMutationRequest:()=>{if(!trusted)throw Error('origin');},getRequestSecurityErrorStatus:()=>403},
    '@/lib/google-click-acceptance':{recordGoogleClickAcceptance:async(...args)=>{accepted.push(args);return 'receipt';}},
    '@/lib/google-click-policy':policy,
  });
  const body={locationId:'m',accepted:true,version:policy.GOOGLE_CLICK_WARNING_VERSION};
  assert.equal((await route.POST(request(body))).status,401);
  session={user:{id:'user',email:'fixture@example.test'},locations:[{merchant:{id:'m'}}]};
  assert.equal((await route.POST(request({...body,accepted:false}))).status,400);
  assert.equal((await route.POST(request({...body,version:'old'}))).status,400);
  assert.equal((await route.POST(request({...body,locationId:'foreign'}))).status,403);
  trusted=false; assert.equal((await route.POST(request(body))).status,403);
  assert.equal(accepted.length,0);
  trusted=true; const result=await route.POST(request(body)); assert.equal(result.status,201);
  assert.deepEqual(await result.json(),{acceptanceId:'receipt'}); assert.deepEqual(accepted,[['m','user']]);
});
