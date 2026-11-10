import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const script = 'content-engine/scripts/engine.mjs';
const run = (...args) => spawnSync(process.execPath, [script, ...args], {encoding:'utf8'});
test('validates real inventory and rejects an unknown article', () => {
 assert.equal(run('audit','/blog/idees-animations-commerciales-boutique').status,0);
 assert.equal(run('audit','/blog/article-inexistant').status,1);
});
test('rejects malformed sources and unfinished checks marked ready', () => {
 const dir=mkdtempSync(path.join(tmpdir(),'okado-brief-'));
 try {
  const brief=JSON.parse(readFileSync('content-engine/briefs/example.json','utf8'));
  brief.status='READY_FOR_HUMAN_REVIEW'; brief.sources[0].url='not-a-url';
  const file=path.join(dir,'brief.json');writeFileSync(file,JSON.stringify(brief));
  const result=run('briefs',file); assert.equal(result.status,1);
  assert.match(result.stderr,/url invalide/); assert.match(result.stderr,/READY exige/);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('a blocked item does not stop validation of other batch items', () => {
 const dir=mkdtempSync(path.join(tmpdir(),'okado-batch-'));
 try {
  const base=JSON.parse(readFileSync('content-engine/briefs/lots-jeu-qr.json','utf8'));
  const results=[];
  for(let i=0;i<4;i++) {
   const b=structuredClone(base); b.topic=`Simulation ${i+1}`;
   if(i===1){b.status='BLOCKED'; b.sources=[];}
   const f=path.join(dir,`${i}.json`);writeFileSync(f,JSON.stringify(b));
   results.push(run('briefs',f).status);
  }
  assert.deepEqual(results,[0,1,0,0]);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('draft publication requires owner and a real, nonfuture date', async () => {
 const ts=(await import('typescript')).default;
 const vm=(await import('node:vm')).default;
 const js=ts.transpileModule(readFileSync('apps/landing-page/src/lib/blog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,process:{env:{NODE_ENV:'production'}}});
 const draft=exports.blogPosts.find(p=>p.draft && p.requiresApproval);
 assert.ok(draft);assert.equal(exports.isPublicBlogPost(draft),false);
 assert.equal(exports.isPublicBlogPost({...draft,draft:false}),false);
 assert.equal(exports.isPublicBlogPost({...draft,draft:false,publicationApproval:{approver:'Pierre-Henri BRUNELLE',date:'2026-02-30'}}),false);
 assert.equal(exports.isPublicBlogPost({...draft,draft:false,publicationApproval:{approver:'Autre',date:'2026-01-01'}}),false);
 assert.equal(exports.isPublicBlogPost({...draft,draft:false,publishedAt:'2099-01-01',publicationApproval:{approver:'Pierre-Henri BRUNELLE',date:'2026-01-01'}}),false);
 assert.equal(exports.isPublicBlogPost({...draft,draft:false,publishedAt:'2026-01-02',publicationApproval:{approver:'Pierre-Henri BRUNELLE',date:'2026-01-01'}}),true);
 const nextDay={...draft,draft:false,publishedAt:'2026-11-11',publicationApproval:{approver:'Pierre-Henri BRUNELLE',date:'2026-11-10'}};
 assert.equal(exports.isPublicBlogPost(nextDay,new Date('2026-11-10T22:59:59Z')),false);
 assert.equal(exports.isPublicBlogPost(nextDay,new Date('2026-11-10T23:00:00Z')),true);
 const summer={...draft,draft:false,publishedAt:'2026-07-01',publicationApproval:{approver:'Pierre-Henri BRUNELLE',date:'2026-06-30'}};
 assert.equal(exports.isPublicBlogPost(summer,new Date('2026-06-30T21:59:59Z')),false);
 assert.equal(exports.isPublicBlogPost(summer,new Date('2026-06-30T22:00:00Z')),true);
});
