// Artifact generation only: exact production renderer, synthetic data, no account/Resend/Supabase.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import QRCode from 'qrcode';
import { renderRewardReminder } from '../src/lib/reward-reminder-email.ts';
const directory=path.resolve(process.argv[2] ?? 'test-results/reward-reminder-preview');
await mkdir(directory,{recursive:true});
const email=renderRewardReminder({origin:'https://app.okado.app',firstName:'Camille',merchantName:'Institut Démo',
campaignTitle:'Les surprises d’automne',prizeLabel:'ÉPILATION OFFERTE',redemptionCode:'DEMO-NON-VALIDE',
expiresAt:'2026-10-19T12:00:00Z',availableAt:'2026-09-20T12:00:00Z',wonAt:'2026-09-19T12:00:00Z',
timeZone:'Europe/Paris',usageConditions:'Valable avec un Brow Lift',merchantEmail:'contact@example.test',
emailSettings:{accentColor:'#481a54'}});
const qr=await QRCode.toDataURL('https://example.test/retrait/DEMO-NON-VALIDE',{width:200,margin:2});
const html=email.html.replace('src="https://app.okado.app/api/public/redeem/DEMO-NON-VALIDE/qr"',`src="${qr}"`);
await writeFile(path.join(directory,'relance.html'),html);
await writeFile(path.join(directory,'relance.txt'),email.text);
const browser=await chromium.launch();
try{for(const width of [680,390,320]){
const page=await browser.newPage({viewport:{width,height:900}});
await page.route('**/*',route=>route.abort());
await page.setContent(html);await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.screenshot({path:path.join(directory,`relance-${width}.png`),fullPage:true});await page.close();
}}finally{await browser.close();}
console.log(JSON.stringify({subject:email.subject,directory,renderedWidths:[680,390,320],sent:false}));
