import assert from 'node:assert/strict';import {test} from 'node:test';
import {parseOperationalMeasurement as parse,summarizeOperationalMeasurements as summarize} from './report-operational-telemetry.mjs';
const sample=n=>({event:'http_request_completed',schemaVersion:1,route:'/campaigns',method:'GET',status:200,durationMs:n,outcome:'success',environment:'production',version:'abcdef123456',region:'cdg1',channel:'operational'});
test('report computes weighted raw durations and keeps environments and statuses distinct',()=>{
 const rows=[100,200,300,400].map(n=>parse(JSON.stringify(sample(n))));rows.push(parse(JSON.stringify({...sample(1),status:500})));rows.push(parse(JSON.stringify({...sample(20),environment:'preview'})));
 const result=summarize(rows);assert.equal(result.length,3);assert.equal(result[0].meanMs,250);assert.equal(result[0].count,4);assert.equal(result[0].p50Ms,200);assert.equal(result[0].p95Ms,400);assert.equal(result[1].status,500);
});
test('report never exports arbitrary fields, identities, malformed lines or unknown stages',()=>{
 const record=parse(JSON.stringify({message:JSON.stringify({...sample(100),route:'/campaigns/private/qr?secret=private',email:'private@example.test'})}));assert(!JSON.stringify(record).includes('private'));assert.equal(parse('not json'),null);assert.equal(parse(JSON.stringify({...sample(1),event:'server_stage_completed',stage:'private'})),null);
});
test('error hooks have no duration instead of a false zero; stage and request counts are separate',()=>{
 const r=parse(JSON.stringify({...sample(1),event:'server_error_detected'})),s=parse(JSON.stringify({...sample(10),event:'server_stage_completed',stage:'auth.context'}));
 const result=summarize([r,s]);assert.equal(result.length,2);assert.equal(result[0].meanMs,null);assert.equal(result[0].durationSamples,0);assert.equal(result[1].meanMs,10);
});
