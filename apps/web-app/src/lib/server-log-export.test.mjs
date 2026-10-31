import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {setTimeout as delay} from 'node:timers/promises';
test('real OTLP transport drains records arriving during concurrent flushes without private trace data',async()=>{
 const packets=[];let arrived,release;const firstArrived=new Promise(r=>arrived=r),gate=new Promise(r=>release=r);
 const server=createServer(async(req,res)=>{let b='';for await(const chunk of req)b+=chunk;packets.push(JSON.parse(b));if(packets.length===1){arrived();await gate}res.writeHead(200,{'content-type':'application/json'}).end('{}')});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 process.env.POSTHOG_OTEL_LOGS_ENABLED='true';process.env.POSTHOG_OTEL_LOGS_TOKEN='phc_synthetic_fixture';process.env.POSTHOG_OTEL_LOGS_HOST='http://127.0.0.1:'+server.address().port;
 const {emitServerMeasurement,flushServerTelemetry,loggerProvider}=await import('./server-log-export.ts');
 const record={event:'http_request_completed',schemaVersion:1,route:'/account',method:'GET',status:200,durationMs:10,outcome:'success'};
 try{
  emitServerMeasurement(record);const a=flushServerTelemetry();await Promise.race([firstArrived,delay(5000,undefined,{ref:false}).then(()=>{throw Error('Collector readiness timed out')})]);
  emitServerMeasurement({...record,route:'/campaigns'});let secondSettled=false;const b=flushServerTelemetry().then(()=>{secondSettled=true});await delay(10);assert.equal(secondSettled,false,'concurrent caller must await the active drain');release();await Promise.all([a,b]);
  const logs=packets.flatMap(p=>p.resourceLogs.flatMap(r=>r.scopeLogs.flatMap(s=>s.logRecords)));
  assert.equal(logs.length,2,'both records delivered before callers settle');
  for(const row of logs){assert(!row.traceId);assert(!row.spanId);const a=Object.fromEntries(row.attributes.map(v=>[v.key,v.value.stringValue??v.value.intValue??v.value.doubleValue]));assert.equal(a.event,'http_request_completed')}
 }finally{release();await loggerProvider.shutdown();server.closeAllConnections();await new Promise(r=>server.close(r))}
});
