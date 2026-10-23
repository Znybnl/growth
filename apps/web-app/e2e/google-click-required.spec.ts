import { expect, test } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ context, page, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {} } }));
});

for (const [width,height] of [[1280,720],[1280,600],[390,844]]) {
  test(`@visual-1280 ${width}x${height} : activation explicite, annulation et sauvegarde du réglage`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-actions-google&template=classic");
    await selectWizardStep(page,4);
    const toggle=page.getByRole("checkbox",{name:/Exiger le clic/});
    await expect(toggle).not.toBeChecked();
    let acceptances=0;
    await page.route("**/api/merchant/google-click-acceptance",async route=>{
      expect(route.request().postDataJSON()).toMatchObject({accepted:true,version:"2026-10-23-v2",locationId:"template-proof-merchant"});
      acceptances++; await route.fulfill({status:201,json:{acceptanceId:"receipt-fixture"}});
    });
    await toggle.click();
    const dialog=page.getByRole("dialog",{name:"Activer le clic Google requis ?"});
    await expect(dialog).not.toContainText("restrictions");
    await expect(dialog).toContainText("peut contrevenir aux règles de Google.");
    await expect(dialog).toContainText("Okado ne peut vérifier ni la publication ni le contenu d’un avis.");
    await expect(dialog).toContainText("aucune obligation de publier un avis");
    await page.screenshot({path:`test-results/google-click-warning-${width}x${height}.png`,fullPage:false});
    await dialog.getByRole("button",{name:"Annuler"}).click();
    expect(acceptances).toBe(0); await expect(toggle).not.toBeChecked();
    await toggle.click(); await dialog.getByRole("button",{name:"Je comprends et j’accepte"}).click();
    await expect(toggle).toBeChecked(); expect(acceptances).toBe(1);
    const save=page.waitForRequest(request=>request.url().endsWith("/api/campaigns/setup")&&request.method()==="POST");
    await page.getByRole("button",{name:"Enregistrer le brouillon",exact:true}).last().click();
    expect((await save).postDataJSON()).toMatchObject({googleClickRequired:true,googleClickAcceptanceId:"receipt-fixture"});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}

for(const template of ["classic","beauty-scratch-nude"]) {
  test(`${template} : Jouer accessible après clic enregistré, erreur de clic puis nouvelle tentative`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.route("**/api/public/campaign/**",route=>route.fulfill({json:{campaign:{actions:[{id:"google-fixture",kind:"google",url:"https://example.test/action"}]}}}));
    let clicks=0;
    await page.route("**/api/public/event",route=>{
      if(route.request().postDataJSON().eventType==="review_clicked") {
        clicks++; return route.fulfill(clicks===1?{status:503,json:{error:"Temporaire"}}:{status:201,json:{marketingClickToken:"signed-click-fixture"}});
      }
      return route.fulfill({json:{}});
    });
    await page.route("https://example.test/**",route=>route.fulfill({body:"Destination de test"}));
    await page.goto(`/dev/template-rendering-proof?mode=public-google-required&template=${template}`);
    if (template.includes("scratch")) await page.getByLabel("Grattez la carte pour révéler votre cadeau.").click();
    else await page.getByRole("button",{name:/jouer/i}).first().click();
    const dialog=page.getByRole("dialog",{name:"Fenêtre de participation"});
    const playNow=dialog.getByRole("button",{name:"Jouer maintenant",exact:true});
    await expect(playNow).toHaveCount(0);
    await dialog.getByRole("link",{name:"Écrire un avis"}).click();
    await expect(dialog.getByText(/Le clic n’a pas pu être enregistré/)).toBeVisible();
    await expect(playNow).toHaveCount(0);
    await dialog.getByRole("link",{name:"Écrire un avis"}).click();
    const play=dialog.getByRole("button",{name:"Jouer",exact:true});
    await expect(play).toBeEnabled();
    const session=page.waitForRequest(request=>request.url().endsWith("/api/public/draw/session"));
    await play.click();
    expect((await session).postDataJSON().marketingClickToken).toBe("signed-click-fixture");
  });
}

for(const mode of ["public-google-optional","public-google-other"]) {
  test(`${mode} : accès direct au jeu conservé`,async({page})=>{
    const kind=mode.endsWith("other")?"instagram":"google";
    await page.route("**/api/public/campaign/**",route=>route.fulfill({json:{campaign:{actions:[{id:"google-fixture",kind,url:"https://example.test/action"}]}}}));
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic`);
    await page.getByRole("button",{name:/jouer/i}).first().click();
    await expect(page.getByRole("dialog").getByRole("button",{name:"Jouer maintenant"})).toBeVisible();
  });
}
