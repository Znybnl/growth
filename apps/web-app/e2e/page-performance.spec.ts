import { expect, test } from "@playwright/test";

const alerts = (emailCount:number) => ({emailCount,emailCampaignId:"demo",
  lowStockCount:1,exhaustedStockCount:0,stockCampaignId:"demo"});

test("coquille et dashboard partagent une requête ; mutation pendant une lecture entraîne un rafraîchissement", async ({page}) => {
  let calls=0;
  let release!:()=>void;
  const pending = new Promise<void>(resolve=>{release=resolve});
  await page.route("**/api/merchant/email-alerts",async route=>{
    calls++;
    if(calls===1) await pending;
    await route.fulfill({json:alerts(calls===1?1:2)});
  });
  await page.goto("/dev/page-performance");
  await expect.poll(()=>calls).toBe(1);
  await page.getByRole("button",{name:"Actualiser les alertes"}).click();
  release();
  await expect(page.getByTestId("alerts")).toHaveText("2");
  await expect(page.getByRole("region",{name:"Alerte stock"})).toBeVisible();
  await page.waitForTimeout(900);
  expect(calls).toBe(2);
});

test("changement de site : état précédent effacé et réponse tardive ignorée",async({page})=>{
  let calls=0;
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve});
  await page.route("**/api/merchant/email-alerts",async route=>{
    const n=++calls;
    if(n===1)await pending;
    try{await route.fulfill({json:alerts(n===1?99:3)})}catch{/* first request may be aborted */}
  });
  await page.goto("/dev/page-performance");
  await expect.poll(()=>calls).toBe(1);
  await page.getByRole("button",{name:"Changer de site"}).click();
  await expect(page.getByTestId("alerts")).toHaveText("loading");
  await expect(page.getByTestId("alerts")).toHaveText("3");
  release();
  await page.waitForTimeout(300);
  await expect(page.getByTestId("alerts")).toHaveText("3");
  expect(calls).toBe(2);
});

test("mobile : panne d'alertes ne bloque pas le contenu ni les actions",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route("**/api/merchant/email-alerts",route=>route.fulfill({status:503,json:{error:"Indisponible"}}));
  await page.goto("/dev/page-performance");
  await expect(page.getByRole("heading",{name:"Vérification des alertes partagées"})).toBeVisible();
  await page.getByRole("button",{name:"Actualiser les alertes"}).click();
  await expect(page.getByRole("button",{name:"Changer de site"})).toBeEnabled();
  const sizes=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
});


test("Accueil @visual-1280 : les indicateurs précèdent les contacts et le filtre reste appliqué", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/api/merchant/email-alerts", (route) => route.fulfill({ json: alerts(0) }));
  await page.goto("/dev/page-performance/contacts?state=ready", { waitUntil: "commit" });
  await expect(page.getByText("Campagnes actives", { exact: true })).toBeVisible();
  const region = page.getByRole("region", { name: "Contacts récents" });
  await expect(region.getByRole("status")).toContainText("Chargement des contacts récents");
  await expect(region.getByText("Soin offert").filter({ visible: true })).toBeVisible();
  await expect(region.getByText("Hors périmètre")).toHaveCount(0);
  await expect(region.getByRole("link", { name: "Ouvrir les données" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("accueil-contacts-1280.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(region.getByText("Soin offert").filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test("Accueil @visual-1280 : contacts vides ou en erreur, les indicateurs restent visibles", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.route("**/api/merchant/email-alerts", (route) => route.fulfill({ json: alerts(0) }));
  for (const [state, message] of [
    ["empty", "Aucun contact récent"],
    ["error", "Les contacts récents sont temporairement indisponibles."],
  ]) {
    await page.goto(`/dev/page-performance/contacts?state=${state}`);
    await expect(page.getByText("Campagnes actives", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Contacts récents" }).getByText(message, { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`accueil-contacts-${state}-1280.png`) });
  }
});
