import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';
import {sanitizeOperationalRecord} from '../src/lib/operational-telemetry-schema.ts';

/** Accept the app's structured JSONL, Vercel message wrapper or flat log attributes. */
export function parseOperationalMeasurement(line){
 try{
  let value=JSON.parse(line);if(typeof value.message==='string')value=JSON.parse(value.message);
  value=value.log_attributes??value.attributes??value;
  if(Array.isArray(value))value=Object.fromEntries(value.map(a=>[a.key,a.value?.stringValue??a.value?.boolValue??(a.value?.intValue==null?a.value?.doubleValue:Number(a.value.intValue))]));
  if(value.channel!=='operational'||value.schemaVersion!==1)return null;
  const safe=sanitizeOperationalRecord(value);if(!safe)return null;
  return {...safe,environment:['production','preview','development','test'].includes(value.environment)?value.environment:'unknown',
   version:/^[a-f0-9]{7,40}$/.test(value.version??'')?value.version:'unknown',region:/^[a-z]{3}\d{1,2}$/.test(value.region??'')?value.region:'unknown'};
 }catch{return null}
}
export function summarizeOperationalMeasurements(records){
 const groups=new Map();
 for(const r of records){const key=JSON.stringify([r.event,r.environment,r.version,r.region,r.route,r.method,r.requestKind,r.status,r.stage,r.outcome]);
  if(!groups.has(key))groups.set(key,{event:r.event,environment:r.environment,version:r.version,region:r.region,route:r.route,method:r.method,requestKind:r.requestKind,status:r.status,stage:r.stage,outcome:r.outcome,count:0,values:[]});
  const g=groups.get(key);g.count++;if(r.durationMs!==undefined)g.values.push(r.durationMs);
 }
 return [...groups.values()].map(({values,...g})=>{values.sort((a,b)=>a-b);const p=q=>values.length?values[Math.ceil(q*values.length)-1]:null;
  return {...g,durationSamples:values.length,meanMs:values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null,p50Ms:p(.5),p75Ms:p(.75),p95Ms:p(.95)};
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const records=[];let ignored=0;
 for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){const r=parseOperationalMeasurement(line);if(r)records.push(r);else ignored++}
 console.log(JSON.stringify({schemaVersion:1,observedRecords:records.length,ignoredLines:ignored,
  note:'Observed exported logs only. Scope the input period/environment first. Missing or truncated logs are not zero traffic. Counts are requests/stages, never people or clicks. Percentiles use nearest rank. Do not add stage durations or average period percentiles.',groups:summarizeOperationalMeasurements(records)},null,2));
}
