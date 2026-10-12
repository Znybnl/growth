import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { registerHooks } from "node:module";
const src=new URL('../',import.meta.url);
registerHooks({resolve(name,context,next){
if(name==='next/server')return next('next/server.js',context);
if(name==='@/lib/auth')return {url:'data:text/javascript,export const getAuthenticatedSession=async()=>globalThis.__reminder.session',shortCircuit:true};
if(name==='@/lib/supabase')return {url:'data:text/javascript,export const getSupabaseAdmin=()=>globalThis.__reminder.db',shortCircuit:true};
if(name==='resend')return {url:"data:text/javascript,export class Resend{constructor(){this.emails={send:async(...args)=>{globalThis.__reminder.sends.push(args);if(globalThis.__reminder.failSend)throw Error('private@example.test');return {data:{id:'provider-test'}}}}}}",shortCircuit:true};
if(name.startsWith('@/'))return next(new URL(name.slice(2)+'.ts',src).href,context);
return next(name,context);
}});
const route=await import('../app/api/merchant/reward-reminders/route.ts');
const cron=await import('../app/api/internal/reward-reminders/route.ts');
const worker=await import('./reward-reminders.ts');
const {renderRewardReminder}=await import('./reward-reminder-email.ts');
const fixture={firstName:'Camille',merchantName:'Institut Démo',campaignTitle:'Jeu Démo',prizeLabel:'ÉPILATION OFFERTE',
redemptionCode:'DEMO-NON-VALIDE',expiresAt:'2030-10-19T12:00Z',availableAt:'2030-09-02T12:00Z',wonAt:'2030-09-01T12:00Z',timeZone:'Europe/Paris',
usageConditions:'Valable avec un Brow Lift',merchantEmail:'shop@example.test',recipient:'camille@example.test'};
let state;
beforeEach(()=>{
delete process.env.REWARD_REMINDERS_ENABLED;delete process.env.VERCEL_ENV;delete process.env.REWARD_REMINDERS_ORIGIN;
state=globalThis.__reminder={session:{user:{id:'u'},workspace:{id:'w'}},calls:[],sends:[],jobs:[],logs:[],settings:{enabled:false,days:7,canEdit:true,updatedAt:null}};
state.db={from(){return {insert:async row=>{state.logs.push(row);return {error:state.logError}}};},async rpc(name,args){state.calls.push([name,args]);
if(state.dbError)return {error:{code:state.dbCode??'private',message:'secret@example.test'}};
if(name==='get_reward_reminder_settings')return {data:state.settings};
if(name==='set_reward_reminder_settings')return {data:{...state.settings,enabled:args.p_enabled,days:args.p_days}};
if(name==='acquire_reward_reminder_runner')return {data:state.locked?null:'runner'};
if(name==='claim_reward_reminder')return {data:state.jobs.shift()??null};
if(name==='get_reward_reminder_input')return {data:fixture};
if(name==='prepare_reward_reminder')return {data:state.frozen??args.p_payload};
if(name==='authorize_reward_reminder')return {data:state.authorized??true};
return {data:true};}};
});
const request=body=>new Request('https://app.okado.app/api/merchant/reward-reminders',{method:'POST',headers:{origin:'https://app.okado.app','content-type':'application/json'},body:JSON.stringify(body)});
function config(){process.env.VERCEL_ENV='production';process.env.REWARD_REMINDERS_ENABLED='true';process.env.REWARD_REMINDERS_ORIGIN='https://app.okado.app';process.env.RESEND_API_KEY='TEST-NOT-A-REAL-KEY';process.env.RESEND_FROM_EMAIL='sender@example.test';}

test('API : visiteur/origine refusés, compte issu de la session, droits et délai strict',async()=>{
state.session=null;assert.equal((await route.GET()).status,401);assert.equal(state.calls.length,0);
state.session={user:{id:'u'},workspace:{id:'w'}};assert.equal((await route.POST(new Request('https://app.okado.app/api/merchant/reward-reminders',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}))).status,403);
for(const days of [0,366,1.5,'7',null])assert.equal((await route.POST(request({enabled:true,days}))).status,400);
state.settings.canEdit=false;assert.equal((await route.POST(request({enabled:true,days:7}))).status,403);
state.settings.canEdit=true;const res=await route.POST(request({enabled:true,days:3,workspace:'other',user:'other',recipient:'injected@example.test'}));assert.equal(res.status,200);
assert.equal(res.headers.get('cache-control'),'private, no-store');assert.deepEqual(state.calls.at(-1),['set_reward_reminder_settings',{p_user:'u',p_workspace:'w',p_enabled:true,p_days:3}]);
});
test('API : erreur sans secret ni faux défaut enregistré',async()=>{state.dbError=true;const res=await route.GET();assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/secret/);state.dbCode='42501';assert.equal((await route.GET()).status,403);});
test('worker : aucune base ni envoi local/preview/désactivé, configuration de cible obligatoire',async()=>{
assert.equal((await worker.dispatchRewardReminders()).skipped,true);assert.equal(state.calls.length,0);config();process.env.REWARD_REMINDERS_ORIGIN='https://preview.example.test';await assert.rejects(worker.dispatchRewardReminders());assert.equal(state.sends.length,0);
});
test('worker : payload exact figé, clé stable, autorisation avant envoi, aucun chemin e-mail initial',async()=>{
config();state.jobs=[{id:'j',lease_token:'lease',email_payload:null}];const result=await worker.dispatchRewardReminders({minIntervalMs:0});assert.equal(result.sent,1);
assert.equal(state.sends[0][1].idempotencyKey,'reward-expiry/j');assert.equal(state.sends[0][0].replyTo,'shop@example.test');assert.match(state.sends[0][0].html,/Brow Lift/);
assert.ok(state.calls.find(c=>c[0]==='authorize_reward_reminder'));assert.equal(state.calls.at(-1)[0],'release_reward_reminder_runner');
state.sends=[];state.jobs=[{id:'j',lease_token:'second',email_payload:{from:'f',to:'camille@example.test',subject:'frozen',html:'frozen',text:'frozen'}}];
await worker.dispatchRewardReminders({minIntervalMs:0});assert.equal(state.sends[0][0].subject,'frozen');assert.equal(state.sends[0][1].idempotencyKey,'reward-expiry/j');
const originalName=fixture.merchantName;
try {fixture.merchantName='\r\n<>"';state.sends=[];state.jobs=[{id:'new',lease_token:'new-lease',email_payload:null}];await worker.dispatchRewardReminders({minIntervalMs:0});assert.equal(state.sends[0][0].from,'Okado <sender@example.test>');}
finally {fixture.merchantName=originalName;}
});
test('worker : aucun envoi si retiré/désactivé, provider ambigu sûr et verrou partagé',async()=>{
config();state.jobs=[{id:'j',lease_token:'l',email_payload:null}];state.authorized=false;await worker.dispatchRewardReminders({minIntervalMs:0});assert.equal(state.sends.length,0);
state.authorized=true;state.failSend=true;state.jobs=[{id:'j',lease_token:'l',email_payload:null}];assert.equal((await worker.dispatchRewardReminders({minIntervalMs:0})).failed,1);
assert.equal(state.calls.findLast(c=>c[0]==='finish_reward_reminder')[1].p_provider,null);state.locked=true;assert.equal((await worker.dispatchRewardReminders()).skipped,true);
});
test('route planifiée : secret dédié, journal non nominatif et défaut sans envoi',async()=>{
assert.equal((await cron.GET(new Request('https://app.okado.app/api/internal/reward-reminders'))).status,401);
process.env.REWARD_REMINDER_CRON_SECRET='test-only-scheduler-secret-not-production';config();state.jobs=[{id:'j',lease_token:'l',email_payload:null}];
const res=await cron.POST(new Request('https://app.okado.app/api/internal/reward-reminders',{headers:{authorization:'Bearer test-only-scheduler-secret-not-production'}}));assert.equal(res.status,200);
assert.equal(state.logs[0].event,'reward_expiry_reminder_run');assert.doesNotMatch(JSON.stringify(state.logs),/camille|shop@|Brow|DEMO-NON|private@/);
});
test('email : même format que le gain, données réelles injectées, logo/conditions/QR et échappement',()=>{
const input={...fixture,origin:'https://app.okado.app',logoUrl:'https://example.test/logo.png'};const e=renderRewardReminder(input);
assert.match(e.html,/Votre gain expire bientôt, Camille/);assert.match(e.html,/Logo de Institut Démo/);assert.match(e.html,/ÉPILATION OFFERTE/);assert.match(e.html,/19 octobre 2030 à 14:00/);
for(const phrase of ['Comment profiter de votre gain','Conditions','QR CODE DE RETRAIT','Code de secours'])assert.ok(e.html.includes(phrase));
assert.match(e.html,/Valable avec un Brow Lift/);assert.match(e.text,/DEMO-NON-VALIDE/);assert.match(e.html,/api\/public\/redeem/);
assert.doesNotThrow(()=>renderRewardReminder({...input,logoUrl:'http://['}));
const cid=renderRewardReminder({...input,logoUrl:'data:image/png;base64,AAAA'});assert.match(cid.html,/cid:campaign-logo/);assert.equal(cid.attachments[0].content,'AAAA');
const custom=renderRewardReminder({...input,prizeLabel:'<script>bad</script>',emailSettings:{senderName:'Mon institut',replyTo:'reply@example.test',body:'Texte personnalisé {{prizeLabel}} {{rewardExpiry}}',accentColor:'#481a54'}});
assert.equal(custom.senderName,'Mon institut');assert.equal(custom.replyTo,'reply@example.test');assert.match(custom.html,/Texte personnalisé/);assert.doesNotMatch(custom.html,/<script>/);assert.match(custom.html,/#481a54/);
});
