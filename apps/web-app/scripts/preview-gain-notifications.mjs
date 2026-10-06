// Generate exact production HTML and browser screenshots with synthetic data.
// No environment, Supabase, Resend, real identity or e-mail send is used.
import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { renderMerchantGainNotification } from "../src/lib/merchant-gain-notification-email.ts";
const output=path.resolve("test-results/gain-notifications");
await mkdir(output,{recursive:true});
const base={merchantName:"Atelier Lumière · Lyon",merchantId:"demo",timeZone:"Europe/Paris",origin:"https://app.okado.app"};
const gains=[
  {leadId:"g1",firstName:"Camille",lastName:"Martin",campaignId:"c1",campaignTitle:"Les surprises d’automne",prizeLabel:"-10% PROCHAINE VISITE",wonAt:"2026-10-05T08:24:00Z"},
  {leadId:"g2",firstName:"Alex",lastName:"Bernard",campaignId:"c1",campaignTitle:"Les surprises d’automne",prizeLabel:"SOIN DÉCOUVERTE OFFERT",wonAt:"2026-10-05T10:42:00Z"},
  {leadId:"g3",firstName:"Lou",lastName:"Petit",campaignId:"c2",campaignTitle:"Votre instant douceur",prizeLabel:"OPTION OFFERTE",wonAt:"2026-10-05T13:16:00Z"},
  {leadId:"g4",firstName:"Charlie",lastName:"Moreau",campaignId:"c1",campaignTitle:"Les surprises d’automne",prizeLabel:"-10% PROCHAINE VISITE",wonAt:"2026-10-05T15:08:00Z"},
];
const examples=[
  {frequency:"instant",periodStart:"2026-10-05T08:24Z",periodEnd:"2026-10-05T08:25Z",gains:gains.slice(0,1)},
  {frequency:"daily",periodStart:"2026-10-04T22:00Z",periodEnd:"2026-10-05T22:00Z",gains},
  {frequency:"weekly",periodStart:"2026-10-04T22:00Z",periodEnd:"2026-10-11T22:00Z",gains:gains.map((g,n)=>({...g,wonAt:`2026-10-${String(5+n).padStart(2,"0")}T10:00Z`}))},
  {frequency:"monthly",periodStart:"2026-09-30T22:00Z",periodEnd:"2026-10-31T23:00Z",gains:gains.map((g,n)=>({...g,wonAt:`2026-10-${String(3+n*7).padStart(2,"0")}T10:00Z`}))},
];
const browser=await chromium.launch();
try{
  for(const example of examples){
    const email=renderMerchantGainNotification({...base,...example});
    for(const content of [email.subject,email.html,email.text]) assert.doesNotMatch(content,/🎁/);
    assert.doesNotMatch(email.html,/✦ Okado|<img|Vos gains/);
    assert.match(email.html,/Camille Martin/);
    assert.match(email.text,/Camille Martin/);
    assert.match(email.html,/modifier vos préférences de notifications/);
    console.log(`${example.frequency} : ${email.subject}`);
    await writeFile(path.join(output,`${example.frequency}.html`),email.html);
    const page=await browser.newPage();
    for(const width of [680,390,320]){
      await page.setViewportSize({width,height:900});
      await page.setContent(email.html);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${example.frequency} ${width}`);
      await page.screenshot({path:path.join(output,`${example.frequency}-${width}.png`),fullPage:true});
    }
    await page.close();
  }
  const stress=renderMerchantGainNotification({...base,...examples[1],part:1,parts:2,
    gains:Array.from({length:40},(_,n)=>({...gains[n%gains.length],leadId:`stress-${n}`,
      firstName:"Camille ".repeat(12),lastName:"Martin ".repeat(12),
      campaignTitle:"Une campagne avec un nom particulièrement long ".repeat(4),
      prizeLabel:"Un lot détaillé pour vérifier la lecture sur petit écran ".repeat(4)}))});
  assert.ok(Buffer.byteLength(stress.html,"utf8")<100_000,"large part remains compact");
  const stressPage=await browser.newPage({viewport:{width:320,height:900}});
  await stressPage.setContent(stress.html);
  assert.equal(await stressPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"40 long rows without overflow");
  assert.equal(await stressPage.locator("table:not([role]) > tbody > tr").count(),40);
  await stressPage.close();
  const widths=await Promise.all(examples.map(e=>sharp(path.join(output,`${e.frequency}-680.png`)).metadata()));
  const height=Math.max(...widths.map(m=>m.height));
  await sharp({create:{width:1360,height:height*2,channels:4,background:"#f6f3f6"}})
    .composite(examples.map((e,i)=>({input:path.join(output,`${e.frequency}-680.png`),left:(i%2)*680,top:Math.floor(i/2)*height})))
    .png().toFile(path.join(output,"four-emails.png"));
  console.log("4 e-mails générés ; 12 rendus contrôlés à 680/390/320 px, plus 40 lignes longues à 320 px. Aucun envoi.");
  console.log(output);
}finally{await browser.close();}
