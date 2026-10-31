const {chromium}=require('@playwright/test');
const sharp=require('sharp');
// Run the marketing-product-captures Playwright test first, then this script
// from the repository root. Only synthetic captures are written; no API writes.
const captureUrl = process.env.MARKETING_CAPTURE_URL || 'http://localhost:3258/';
(async()=>{
 await sharp('apps/web-app/test-results/marketing-product-captures-5c906-rchand-sur-données-fictives-chromium/merchant-dashboard.png').resize({width:1600}).webp({quality:85}).toFile('apps/landing-page/public/images/merchant-dashboard.webp');
 const b=await chromium.launch();
 const p=await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
 await p.route(/posthog|_vercel\/insights/,r=>r.abort());
 await p.goto(captureUrl);
 const refusal = p.getByRole('button',{name:'Refuser',exact:true});
 if (await refusal.isVisible()) await refusal.click();
 for(const s of ['beauty','restaurant','retail']){
  await p.locator(`a[href="#demo-${s}"]`).first().click();
  await p.evaluate(()=>document.fonts.ready);
  const phone=p.getByTestId('demo-phone');
  await phone.scrollIntoViewIfNeeded();
  await phone.evaluate(async element => {
   const background = getComputedStyle(element).backgroundImage;
   if (background.startsWith('url(')) {
    const image = new Image(); image.src = background.slice(4, -1).replace(/^"|"$/g, '');
    await image.decode();
   }
  });
  await p.waitForTimeout(500);
  await sharp(await phone.screenshot({animations:'disabled'})).webp({quality:85}).toFile(`apps/landing-page/public/images/demo-${s}.webp`);
 }
 await b.close();
})();
