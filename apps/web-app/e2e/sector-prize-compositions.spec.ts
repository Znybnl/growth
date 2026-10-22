import { expect, test, type Page } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import beauty from "../src/lib/beauty-catalog-466.fixture.json";
import additions from "../src/lib/prize-catalog-623.fixture.json";
const suggestions = [...beauty, ...additions].map(item => ({ ...item, industrySubsector: item.industrySubsector ?? undefined, isActive: true }));
test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
  await page.route("**/api/prize-suggestions?**", route => route.fulfill({ json: { suggestions } }));
});
async function start(page: Page, admin = false, scratch = false, business = "beauty") {
  await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-create${admin ? "-admin" : ""}&business=${business}`);
  if (scratch) await page.getByRole("button", { name: /Ticket à gratter/ }).click();
  const next = page.getByTestId("wizard-footer").getByRole("button", { name: "Continuer", exact: true });
  await next.click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Jeu de test composition");
  await next.click();
  await next.click();
  await expect(page.getByTestId("wizard-prizes-step")).toBeVisible();
}
for (const config of [{width:1280,height:720,admin:false,scratch:false},{width:1280,height:600,admin:true,scratch:true},{width:390,height:740,admin:false,scratch:true},{width:320,height:740,admin:false,scratch:false}]) {
  test(`@visual-1280 choix initial explicite ${JSON.stringify(config)}`, async ({ page }, info) => {
    await page.setViewportSize(config);
    const writes: Array<{prizes: Array<Record<string, unknown>>}> = [];
    await page.route("**/campaigns/setup", route => { writes.push(route.request().postDataJSON()); return route.fulfill({json:{campaign:{id:"test"}}}); });
    await page.route("**/locations/*/campaigns/setup", route => { writes.push(route.request().postDataJSON()); return route.fulfill({json:{campaign:{id:"test"}}}); });
    await start(page, config.admin, config.scratch);
    const starter=page.getByTestId("wizard-starter-compositions");
    await expect(starter.getByTestId("wizard-composition-card")).toHaveCount(3);
    await expect(starter.getByText("Recommandé",{exact:true})).toBeVisible();
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(0);
    await expect(page.getByText("-10% PROCHAINE VISITE",{exact:true})).toHaveCount(0);
    expect(writes).toHaveLength(0);
    await starter.getByTestId("wizard-composition-card").nth(1).scrollIntoViewIfNeeded();
    if(config.width===1280) await captureVisualAt1280(page,info,"choix-initial",config.height);
    else { await assertNoPageOverflow(page); await page.screenshot({path:info.outputPath("choix-initial-mobile.png")}); }
    await starter.getByRole("button",{name:"Voir la composition : Équilibré",exact:true}).click();
    const dialog=page.getByRole("dialog",{name:"Ajouter des lots",exact:true});
    await expect(dialog.getByRole("list",{name:"Lots de la composition"}).getByRole("listitem")).toHaveCount(3);
    await expect(dialog.getByText("Achat requis pour utiliser ce gain",{exact:true})).toHaveCount(1);
    await expect(dialog.getByText("Conditions d’utilisation proposées",{exact:true})).toHaveCount(3);
    await dialog.getByRole("list",{name:"Lots de la composition"}).getByRole("listitem").nth(1).scrollIntoViewIfNeeded();
    await expect(dialog.getByText("Achat requis pour utiliser ce gain",{exact:true})).toBeInViewport();
    if(config.width===1280) await captureVisualAt1280(page,info,"detail-conditions",config.height);
    else { await assertNoPageOverflow(page); await page.screenshot({path:info.outputPath("detail-conditions-mobile.png")}); }
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(0);
    await dialog.getByRole("button",{name:"Utiliser cette composition",exact:true}).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(3);
    await expect(starter).toHaveCount(0);
    await page.getByTestId("wizard-footer").getByRole("button",{name:"Enregistrer le brouillon",exact:true}).click();
    await expect.poll(()=>writes.length).toBe(1);
    expect(writes[0].prizes.map(s=>s.probability)).toEqual([35,25,10]);
    expect(writes[0].prizes[1].purchaseRequired).toBe(true);
    expect(writes[0].prizes.every(s=>s.label!=="PERDU" && s.usageConditions)).toBe(true);
    await assertNoPageOverflow(page);
  });
}
test("catalogue en échec puis vide : réessai, création manuelle et aucun lot de secours",async({page})=>{
  let fail=true;
  await page.route("**/api/prize-suggestions?**",route=>route.fulfill(fail?{status:503,json:{}}:{json:{suggestions:[]}}));
  await start(page);
  const starter=page.getByTestId("wizard-starter-compositions");
  await expect(starter.getByRole("alert")).toContainText("Impossible de charger");
  fail=false;await starter.getByRole("button",{name:"Réessayer",exact:true}).click();
  await expect(starter).toContainText("Aucune composition disponible");
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(0);
  await page.getByRole("button",{name:"Créer un lot",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Créer un lot",exact:true})).toBeVisible();
});

for (const invalid of [{ suggestions: {} }, { suggestions: [null] }]) {
  test(`catalogue malformé récupérable : ${JSON.stringify(invalid)}`, async ({page}) => {
    let broken=true;
    await page.route("**/api/prize-suggestions?**",route=>route.fulfill({json:broken?invalid:{suggestions}}));
    await start(page);
    const starter=page.getByTestId("wizard-starter-compositions");
    await expect(starter.getByRole("alert")).toContainText("Impossible de charger");
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(0);
    await page.getByRole("button",{name:"Créer un lot",exact:true}).click();
    const editor=page.getByRole("dialog",{name:"Créer un lot",exact:true});
    await expect(editor).toBeVisible();
    await editor.getByRole("button",{name:"Annuler",exact:true}).click();
    broken=false;
    await starter.getByRole("button",{name:"Réessayer",exact:true}).click();
    await expect(starter.getByTestId("wizard-composition-card")).toHaveCount(3);
    await expect(page.getByTestId("wizard-prize-row")).toHaveCount(0);
  });
}

test("restauration : recettes du secteur et conditions d’achat conservées",async({page})=>{
  await start(page,false,false,"restaurant");
  await page.getByTestId("wizard-starter-compositions").getByRole("button",{name:"Voir la composition : Équilibré",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Ajouter des lots",exact:true});
  await expect(dialog.getByRole("list",{name:"Lots de la composition"})).toContainText("BOISSON OFFERTE");
  await expect(dialog).toContainText("commande payante");
  await dialog.getByRole("button",{name:"Utiliser cette composition",exact:true}).click();
  await page.getByRole("button",{name:"Modifier GOURMANDISE OFFERTE",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Modifier le lot",exact:true});
  await expect(editor.getByRole("checkbox",{name:/Un achat est nécessaire/})).toBeChecked();
  await expect(editor.getByLabel("Conditions d’utilisation")).toHaveValue(/commande payante/);
});

test("une réponse tardive du catalogue ne remplace pas un lot créé manuellement",async({page})=>{
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/api/prize-suggestions?**",async route=>{await gate;await route.fulfill({json:{suggestions}});});
  await start(page);
  await expect(page.getByTestId("wizard-starter-compositions").getByRole("status")).toContainText("Chargement");
  await page.getByRole("button",{name:"Créer un lot",exact:true}).click();
  const editor=page.getByRole("dialog",{name:"Créer un lot",exact:true});
  await editor.getByLabel(/Nom du lot/).fill("Mon cadeau personnel");
  await editor.getByRole("button",{name:"Ajouter le lot",exact:true}).click();
  release();
  await expect(page.getByTestId("wizard-prize-row")).toHaveCount(1);
  await expect(page.getByTestId("wizard-prize-row")).toContainText("Mon cadeau personnel");
  await expect(page.getByTestId("wizard-starter-compositions")).toHaveCount(0);
});
