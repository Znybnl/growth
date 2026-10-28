// Public pages only. No user profile or account; analytics explicitly blocked.
// Usage: node scripts/audit-mobile-519.mjs <lighthouse-package-dir> <origin> <output-dir> [runs=3]
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const [packageDir, origin, destination, repeats = '3'] = process.argv.slice(2);
if (!packageDir || !origin || !destination) throw new Error('Expected lighthouse directory, origin and output directory.');
const target = new URL(origin);
if (target.username || target.password || target.search || target.hash) throw new Error('Origin only, without credentials.');
const requireLH = createRequire(join(resolve(packageDir), 'package.json'));
const { default: lighthouse } = await import(pathToFileURL(join(resolve(packageDir), 'core/index.js')).href);
const { launch } = requireLH('chrome-launcher');
const config = createRequire(import.meta.url)('./lighthouse-mobile.cjs');
const directory = resolve(destination);
await mkdir(directory, { recursive: true });
const measurements = [];
const paths = ['/', '/instituts-beaute', '/restaurants', '/tarifs'];
// Interleave pages and choices to avoid comparing one entire page after host drift.
for (let run = 1; run <= Number(repeats); run++) {
  for (const path of paths) {
    for (const choice of ['first-visit', 'rejected']) {
      const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless', '--no-first-run', '--disable-extensions'] });
      let browser;
      try {
        browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
        if (choice === 'rejected') await browser.contexts()[0].addCookies([{
          name: 'okado_analytics_consent',
          value: encodeURIComponent(JSON.stringify({ version: '2026-10-15', choice: 'rejected', decidedAt: Date.now() })),
          url: target.origin, sameSite: 'Lax',
        }]);
        const result = await lighthouse(new URL(path, target).href, {
          port: chrome.port, output: 'json', logLevel: 'error', disableStorageReset: true,
        }, config);
        const lhr = result.lhr;
        if (lhr.runtimeError) throw new Error(JSON.stringify(lhr.runtimeError));
        const report = JSON.stringify(lhr);
        const name = `${path === '/' ? 'home' : path.slice(1)}-${choice}-${run}.json`;
        await writeFile(join(directory, name), report);
        const audits = lhr.audits;
        const requests = audits['network-requests']?.details?.items ?? [];
        const analyticsRequests = requests.filter(item => /posthog\.com|\/_vercel\/insights\//.test(item.url));
        const record = {
          path, choice, run, fetchedAt: lhr.fetchTime, finalUrl: lhr.finalDisplayedUrl,
          lighthouseVersion: lhr.lighthouseVersion, userAgent: lhr.userAgent,
          benchmarkIndex: lhr.environment.benchmarkIndex, settings: lhr.configSettings,
          score: lhr.categories.performance.score * 100,
          lcp: audits['largest-contentful-paint'].numericValue,
          tbt: audits['total-blocking-time'].numericValue,
          cls: audits['cumulative-layout-shift'].numericValue,
          fcp: audits['first-contentful-paint'].numericValue,
          bytes: requests.reduce((total, item) => total + (item.transferSize ?? 0), 0),
          jsBytes: requests.filter(item => item.resourceType === 'Script').reduce((total, item) => total + (item.transferSize ?? 0), 0),
          analyticsRequests: analyticsRequests.length, warnings: lhr.runWarnings,
          diagnostics: Object.fromEntries(['unused-javascript', 'mainthread-work-breakdown', 'bootup-time', 'lcp-breakdown-insight', 'image-delivery-insight', 'render-blocking-insight'].map(id => [id, audits[id]?.details])),
          sha256: createHash('sha256').update(report).digest('hex'), report: name,
        };
        measurements.push(record);
        await writeFile(join(directory, 'summary.json'), JSON.stringify(measurements, null, 2));
        console.log(JSON.stringify({ path, choice, run, score: record.score, lcp: record.lcp, tbt: record.tbt, cls: record.cls, jsBytes: record.jsBytes, benchmark: record.benchmarkIndex, analyticsRequests: record.analyticsRequests, warnings: record.warnings }));
      } finally {
        if (browser) await browser.close().catch(() => {});
        try { await chrome.kill(); } catch { /* Browser may already be closed. */ }
      }
    }
  }
}
