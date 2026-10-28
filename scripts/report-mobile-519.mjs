// Aggregate only public-page laboratory reports. Raw reports stay outside Git.
// node scripts/report-mobile-519.mjs <production-dir> <before-dir> <after-dir> <output.json>
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
const [productionDir, beforeDir, afterDir, output] = process.argv.slice(2);
if (!output) throw new Error('Expected three report directories and output JSON.');
const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const range = values => [Math.min(...values), Math.max(...values)];
const phases = {};
for (const [phase, directory] of Object.entries({ production: productionDir, before: beforeDir, after: afterDir })) {
  const rows = JSON.parse(await readFile(join(directory,'summary.json'),'utf8'));
  if (rows.length !== 24 || rows.some(row => row.analyticsRequests !== 0)) throw new Error(`Incomplete/invalid phase ${phase}`);
  const observed = new Map(await Promise.all(rows.map(async row => {
    const raw = JSON.parse(await readFile(join(directory,row.report),'utf8'));
    return [row.report,raw.audits.metrics.details.items[0].observedLargestContentfulPaint];
  })));
  const groups = [];
  for (const path of ['/', '/instituts-beaute', '/restaurants', '/tarifs']) {
    for (const choice of ['first-visit','rejected']) {
      const samples = rows.filter(row=>row.path===path && row.choice===choice);
      if (samples.length !== 3) throw new Error('Expected three repetitions in each group.');
      groups.push({ path, choice, samples: samples.length,
        median: Object.fromEntries(['score','lcp','tbt','cls','fcp','bytes','jsBytes'].map(key=>[key,median(samples.map(row=>row[key]))])),
        scoreRange: range(samples.map(row=>row.score)), lcpRange: range(samples.map(row=>row.lcp)), tbtRange:range(samples.map(row=>row.tbt)),
      });
    }
  }
  phases[phase] = { archive:basename(directory), cpuRange:range(rows.map(row=>row.benchmarkIndex)), groups,
    runs: rows.map(row=>({ path:row.path, choice:row.choice, run:row.run, fetchedAt:row.fetchedAt,
      finalUrl:row.finalUrl, version:row.lighthouseVersion, userAgent:row.userAgent, benchmarkIndex:row.benchmarkIndex,
      score:row.score,lcp:row.lcp,tbt:row.tbt,cls:row.cls,bytes:row.bytes,jsBytes:row.jsBytes,
      observedLcp:observed.get(row.report),
      warnings:row.warnings,analyticsRequests:row.analyticsRequests,report:row.report,sha256:row.sha256,
      lcpElement:row.diagnostics['lcp-breakdown-insight']?.items?.find(item=>item.type==='node')?.selector,
      mainThread:row.diagnostics['mainthread-work-breakdown']?.items,
      unusedJs:row.diagnostics['unused-javascript']?.overallSavingsBytes,
      imageSavings:row.diagnostics['image-delivery-insight']?.debugData?.wastedBytes,
    })),
    settings: rows[0].settings,
  };
}
const result = { date:'2026-10-25', baseSha:'622f449d021b83c9ca4935e5761d7c9319b3899e',
  productionDeployment:'dpl_Gdzh9dsN5tSt3rxxksWyZRk81X7o',
  protocol:'Three interleaved mobile runs per URL and consent choice; fresh isolated browser each time, no concurrent build/test; Next production builds for the local comparison.',
  localEnvironment:'Synthetic public analytics key solely to exercise the same consent UI. Analytics blocked. No real user profile.',
  fieldData:{ lcpP75:null,inpP75:null,clsP75:null,psiHttpStatus:429,reason:'RESOURCE_EXHAUSTED; no field verdict obtained from this attempt' },
  limits:['Laboratory only; TBT is not INP.','Public production CPU strongly variable; local before/after still sequential, not a randomized controlled benchmark.','Do not compare local simulated times directly with hosted production; compare the two local phases.','No guaranteed performance gain or SEO ranking claim.'],
  phases,
};
await writeFile(output,JSON.stringify(result,null,2)+'\n');
for(const name of Object.keys(phases)) {
  console.log(name, phases[name].cpuRange);
  console.table(phases[name].groups.map(group=>({path:group.path,choice:group.choice,...group.median})));
}
