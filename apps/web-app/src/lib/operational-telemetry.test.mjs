import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { registerHooks } from 'node:module';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const state=globalThis.__operational710={records:[],after:[],wait:[],exportEnabled:true};
registerHooks({resolve(name,context,next){
 const mocks={
 'next/server':'export const after=fn=>{if(globalThis.__operational710.afterThrows)throw Error("outside request");globalThis.__operational710.after.push(fn)}',
 '@vercel/functions':'export const waitUntil=p=>globalThis.__operational710.wait.push(p)',
 '@/lib/server-log-export':'export const emitServerMeasurement=r=>{if(globalThis.__operational710.sinkThrows)throw Error("sink failed");globalThis.__operational710.records.push(r)};export const isServerTelemetryEnabled=()=>globalThis.__operational710.exportEnabled;export const flushServerTelemetry=async()=>{globalThis.__operational710.flushed=true};export const registerServerLogs=()=>{};export const emitServerError=()=>{}',
 };if(name in mocks)return{url:'data:text/javascript,'+encodeURIComponent(mocks[name]),shortCircuit:true};return next(name,context);
}});
const schema=await import('./operational-telemetry-schema.ts');
const {OPERATIONAL_API_ROUTES}=await import('./operational-api-routes.ts');
const {emitOperationalRecord,isOperationalTelemetryEnabled}=await import('./operational-telemetry.ts');
const {OperationalRequestProcessor}=await import('./operational-tracing.ts');
const {TracerProvider,AlwaysOnSampler}=await import('@opentelemetry/sdk-trace');
const {measureServerStage:rawMeasure}=await import('./server-performance.ts');
const {context,trace,createTraceState}=await import('@opentelemetry/api');
const {AsyncLocalStorageContextManager}=await import('@opentelemetry/context-async-hooks');
context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
const measureServerStage=(stage,work)=>context.with(trace.setSpan(context.active(),trace.wrapSpanContext({traceId:'00000000000000000000000000000001',spanId:'0000000000000001',traceFlags:1,traceState:createTraceState('okado=request')})),()=>rawMeasure(stage,work));
const original=console.info,output=[];console.info=v=>output.push(JSON.parse(v));
process.on('exit',()=>{console.info=original;delete globalThis.__operational710});
beforeEach(()=>{process.env.OKADO_OPERATIONAL_LOGS_ENABLED='true';process.env.OKADO_PERFORMANCE_LOGS='true';delete process.env.NEXT_PHASE;Object.assign(state,{records:[],after:[],wait:[],exportEnabled:true,afterThrows:false,sinkThrows:false,flushed:false});output.length=0});
const record=()=>schema.requestMeasurement({'http.route':'/account','http.method':'GET','http.status_code':200},10,false);
test('closed registry covers all API files and preserves static routes',()=>{
 const root=fileURLToPath(new URL('../app/api',import.meta.url)),routes=[];function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name==='route.ts')routes.push('/api/'+path.relative(root,path.dirname(p)).split(path.sep).join('/'))}}walk(root);
 assert.deepEqual([...OPERATIONAL_API_ROUTES].sort(),routes.sort());for(const r of routes)assert.equal(schema.operationalRoute(r),r);
 assert.equal(schema.operationalRoute('/api/campaigns/setup'),'/api/campaigns/setup');assert.equal(schema.operationalRoute('/api/admin/merchants/private/profile?token=secret'),'/api/admin/merchants/[merchantId]/profile');
 assert.equal(schema.operationalRoute('/campaigns/private/edit/guided'),'/campaigns/[id]/edit/guided');assert.equal(schema.operationalRoute('/(merchant)/account'),'/account');assert.equal(schema.operationalRoute('/private@example.test'),'/unmatched');assert.equal(schema.operationalRoute('/_not-found'),'/not-found');assert.equal(schema.operationalRoute('/_next/static/private'),undefined);
});
test('safe status, duration, RSC and prefetch; arbitrary attributes are excluded',()=>{
 const r=schema.requestMeasurement({'http.target':'/api/campaigns/secret/qr?token=private','http.method':'GET','http.status_code':404,email:'private@example.test'},1234.567,true);
 assert.equal(r.route,'/api/campaigns/[id]/qr');assert.equal(r.durationMs,1234.6);assert.equal(r.prefetch,'unknown');assert.equal(r.instanceFirstRequest,true);assert(!JSON.stringify(r).includes('private'));
 for(const v of [Infinity,NaN,-1,3_600_001])assert.equal(schema.requestMeasurement({},v,false),undefined);
 assert.equal(schema.requestMeasurement({'http.route':'/account','next.rsc':true},1,false).requestKind,'rsc');
 for(const[status,outcome]of [[200,'success'],[302,'redirect'],[401,'client_error'],[404,'client_error'],[500,'server_error']])assert.equal(schema.requestMeasurement({'http.status_code':status},1,false).outcome,outcome);
 assert.equal(schema.requestMeasurement({'http.status_code':999},1,false).status,undefined);
});
test('server logging works with rejected consent and filters again at the sink',()=>{
 globalThis.document={cookie:'okado_consent=rejected'};emitOperationalRecord({...record(),email:'private@example.test',body:'secret'});delete globalThis.document;
 assert.equal(output.length,1);assert.equal(state.records.length,1);assert.equal(state.after.length,1);assert(!JSON.stringify(output).includes('private'));assert(!JSON.stringify(state.records).includes('secret'));
 emitOperationalRecord({event:'server_stage_completed',stage:'private@example.test',durationMs:2,outcome:'success'});assert.equal(state.records.length,1);
});
test('kill switch and build phase; local logs remain available with exporter off',()=>{
 process.env.OKADO_OPERATIONAL_LOGS_ENABLED='false';assert.equal(isOperationalTelemetryEnabled(),false);emitOperationalRecord(record());assert.equal(output.length,0);
 process.env.OKADO_OPERATIONAL_LOGS_ENABLED='true';process.env.NEXT_PHASE='phase-production-build';emitOperationalRecord(record());assert.equal(output.length,0);delete process.env.NEXT_PHASE;
 state.exportEnabled=false;emitOperationalRecord(record());assert.equal(output.length,1);assert.equal(state.after.length,0);
});
test('SDK callback uses a managed fallback promise and sink failure never escapes',async()=>{
 state.afterThrows=true;emitOperationalRecord(record());assert.equal(state.wait.length,1);await Promise.all(state.wait);assert.equal(state.flushed,true);
 state.sinkThrows=true;assert.doesNotThrow(()=>emitOperationalRecord(record()));assert.equal(output.length,2);
});
test('real trace SDK emits only completed root requests and no raw span data',async()=>{
 const processor=new OperationalRequestProcessor(),provider=new TracerProvider({sampler:new AlwaysOnSampler(),spanProcessors:[processor]}),tracer=provider.getTracer('synthetic');
 const r=tracer.startSpan('private@example.test',{attributes:{'next.span_type':'BaseServer.handleRequest','http.target':'/api/campaigns/secret/qr?token=private','http.method':'GET','http.status_code':200}});
 tracer.startSpan('private fetch',{attributes:{'next.span_type':'AppRender.fetch'}}).end();r.end();assert.equal(state.records.length,1);assert.equal(state.records[0].instanceFirstRequest,true);assert.equal(state.records[0].route,'/api/campaigns/[id]/qr');assert(!JSON.stringify(state.records).includes('private'));
 tracer.startSpan('second',{attributes:{'next.span_type':'BaseServer.handleRequest','http.route':'/data','http.status_code':500}}).end();assert.equal(state.records[1].instanceFirstRequest,false);assert.equal(state.records[1].outcome,'server_error');await provider.shutdown();
});
test('stage instrumentation preserves returned values and errors, classifying redirects separately',async()=>{
 const value={unchanged:true};assert.equal(await measureServerStage('auth.validate',async()=>value),value);assert.equal(state.records[0].stage,'auth.validate');
 const redirect={digest:'NEXT_REDIRECT;replace;/private;307;'};await assert.rejects(measureServerStage('page.home',async()=>{throw redirect}),e=>e===redirect);assert.equal(state.records[1].outcome,'redirect');assert(!JSON.stringify(state.records).includes('/private'));
 const fail=Error('private@example.test');await assert.rejects(measureServerStage('data.prizes',async()=>{throw fail}),e=>e===fail);assert.equal(state.records[2].outcome,'server_error');
});

test('stages outside a real HTTP request do not count as usage',async()=>{await rawMeasure('page.home',async()=>1);assert.equal(state.records.length,0)});

const {onRequestError}=await import('../instrumentation.ts');
test('Next server error hook never reads request headers or exports exception text',async()=>{
 const req={path:'/campaigns/private/edit/guided?token=private',method:'GET',get headers(){throw Error('headers must not be read')}};
 await onRequestError(Error('person-private@example.test'),req,{routePath:'/campaigns/[id]/edit/guided'});
 assert.equal(state.records.length,1);assert.equal(state.records[0].route,'/campaigns/[id]/edit/guided');assert(!JSON.stringify(state.records).includes('private'));
});
test('Next redirects and not-found control flow are not reported as server failures',async()=>{
 for(const digest of ['NEXT_REDIRECT;replace;/private;307;','NEXT_HTTP_ERROR_FALLBACK;404'])await onRequestError({digest},{path:'/private',method:'GET'},{routePath:'/_not-found'});
 assert.equal(state.records.length,0);
});
