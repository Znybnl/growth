import {expect,test} from '@playwright/test';
for(const size of [{width:1280,height:720},{width:1280,height:600},{width:390,height:844}]){
 test(`@visual-1280 notice de journalisation serveur ${size.width}x${size.height}`,async({page},testInfo)=>{
  await page.setViewportSize(size);await page.goto('/confidentialite');
  const notice=page.getByText('Pour diagnostiquer les pannes et assurer la fiabilité du service',{exact:false});
  await expect(notice).toContainText('Cette journalisation d’exploitation ne dépend pas du choix de cookies de mesure');
  await notice.scrollIntoViewIfNeeded();await expect(notice).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`operational-privacy-${size.width}x${size.height}.png`)});
 });
}
