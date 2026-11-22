import { expect, test } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
test.beforeEach(async ({page}) => { await page.route("**/api/**", r => r.fulfill({json:{campaign:{actions:[]},items:[],assets:{}}})); });
test("ticket Sunset Drive : rendu partagé et zone de grattage", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  for (const mode of ["public", "game-preview"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&business=travel&template=travel-scratch-sunset-drive&background=%2335166c&headline=Sunset%20Drive&secondary=Tentez%20votre%20chance&ink=%234488aa`);
    const title=page.locator('h2').filter({hasText:'Sunset Drive'}).first();
    await expect(title).toHaveCSS('text-transform','uppercase');
    await expect(title).toHaveCSS('color','rgb(255, 240, 214)');
    await expect(page.getByTestId('travel-scratch-subtitle')).toHaveCSS('color','rgb(255, 240, 214)');
    await expect(page.getByTestId('scratch-ticket-surface').locator('canvas')).toBeVisible();
  }
});
test("ticket Sunset Drive disponible aux commerces dans les deux éditeurs", async ({page}) => {
  await page.setViewportSize({width:1280,height:720});
  for (const mode of ['wizard-responsive-edit','editor-prize-budget']) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=travel-scratch-elegant&business=retail`);
    if(mode.startsWith('wizard')) await selectWizardStep(page,2);
    const card=page.getByTestId('classic-template-options').getByRole('button',{name:/Sunset Drive/});
    await card.click(); await expect(card).toHaveAttribute('aria-pressed','true');
  }
});
