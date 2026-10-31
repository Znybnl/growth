import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
const packets=[];let reject=false,rejectedPackets=0;
const collector=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;try{packets.push(JSON.parse(body))}catch{res.writeHead(400).end();return}if(reject)rejectedPackets++;res.writeHead(reject?503:200,{'content-type':'application/json'}).end('{}')});
await new Promise(resolve=>collector.listen(0,'127.0.0.1',resolve));
const sink='http://127.0.0.1:'+collector.address().port;
const reservation=createServer();await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
const root=fileURLToPath(new URL('../',import.meta.url)),nextBin=new URL('../../../node_modules/next/dist/bin/next',import.meta.url);
const child=spawn(process.execPath,[fileURLToPath(nextBin),'start','-H','127.0.0.1','-p',String(port)],{cwd:root,stdio:['ignore','pipe','pipe'],env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',OKADO_OPERATIONAL_LOGS_ENABLED:'true',OKADO_PERFORMANCE_LOGS:'true',POSTHOG_OTEL_LOGS_ENABLED:'true',POSTHOG_OTEL_LOGS_TOKEN:'phc_synthetic_operational_fixture',POSTHOG_OTEL_LOGS_HOST:sink,NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',RESEND_WEBHOOK_SECRET:'',RESEND_API_KEY:'',STRIPE_SECRET_KEY:'',VERCEL_ENV:'production'}});
let logs='',exportFailureVisible=false;child.stdout.on('data',b=>{logs+=b.toString()});child.stderr.on('data',b=>{if(b.toString().includes('server_telemetry_export_failed'))exportFailureVisible=true});const origin='http://127.0.0.1:'+port;
const attrs=v=>Object.fromEntries((v||[]).map(a=>[a.key,a.value.stringValue??a.value.boolValue??(a.value.intValue===undefined?a.value.doubleValue:Number(a.value.intValue))]));
const records=()=>packets.flatMap(p=>(p.resourceLogs||[]).flatMap(r=>(r.scopeLogs||[]).flatMap(s=>(s.logRecords||[]).map(l=>({attributes:attrs(l.attributes),traceId:l.traceId,spanId:l.spanId})))));
async function waitFor(predicate){for(let i=0;i<100;i++){if(predicate())return;await delay(100)}throw Error('Timed out waiting for synthetic operational evidence')}
try{
 let ready=false;for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error('Compiled server exited');try{if((await fetch(origin+'/api/webhooks/resend')).status===405){ready=true;break}}catch{}await delay(100)}assert(ready);
 const headers={cookie:'okado_consent=rejected; private-cookie=do-not-log','x-private-header':'person-private@example.test'};
 assert.equal((await fetch(origin+'/api/google-places/search?token=do-not-log',{headers})).status,401);
 assert.equal((await fetch(origin+'/missing/person-private@example.test?token=do-not-log',{headers})).status,404);
 assert.equal((await fetch(origin+'/api/webhooks/resend?token=do-not-log',{method:'POST',headers,body:'body-do-not-log'})).status,500);
 assert.equal((await fetch(origin+'/connexion',{headers})).status,200);
 assert([302,303,307].includes((await fetch(origin+'/campaigns',{headers,redirect:'manual'})).status));
 await waitFor(()=>records().some(r=>r.attributes.event==='http_request_completed'&&r.attributes.status===500)&&records().some(r=>r.attributes.event==='server_stage_completed'));
 await waitFor(()=>records().filter(x=>x.attributes.event==='http_request_completed').length>=6);
 const r=records().filter(r=>r.attributes.channel==='operational');
 assert.equal(r.filter(x=>x.attributes.event==='http_request_completed').length,6,'one root measurement per HTTP request');
 for(const status of [200,401,404,500])assert(r.some(x=>x.attributes.event==='http_request_completed'&&x.attributes.status===status),'missing HTTP '+status);
 assert(r.some(x=>x.attributes.route==='/api/google-places/search'&&x.attributes.status===401));
 assert(r.some(x=>x.attributes.stage==='page.campaigns'&&x.attributes.outcome==='redirect'));
 for(const x of r){assert(!x.traceId);assert(!x.spanId);assert(!JSON.stringify(x).includes('do-not-log'));assert(!JSON.stringify(x).includes('person-private'))}
 assert(!JSON.stringify(packets).includes('body-do-not-log'));
 reject=true;assert.equal((await fetch(origin+'/api/google-places/search',{headers})).status,401);
 await waitFor(()=>rejectedPackets>0);await waitFor(()=>exportFailureVisible);assert.equal((await fetch(origin+'/api/google-places/search',{headers})).status,401);
 assert(logs.includes('"event":"operational_tracing_status","active":true'));
 console.log(JSON.stringify({result:'OK',compiledServer:true,consent:'rejected',statuses:[200,401,404,500],rootRequests:r.filter(x=>x.attributes.event==='http_request_completed').length,stageRecords:r.filter(x=>x.attributes.event==='server_stage_completed').length,privateDataExported:false,rawTraceIdsExported:false,collectorFailureDoesNotBreakResponse:true,exportFailureVisible}));
}finally{child.kill();if(child.exitCode===null)await Promise.race([once(child,'exit'),delay(3000)]);collector.closeAllConnections();await new Promise(resolve=>collector.close(resolve));}
