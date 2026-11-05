import { expect, test, type Page } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
import { rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { parseCampaignSetupInput } from "../src/lib/merchant-input";
import { DEFAULT_WHEEL_SUBTITLE } from "../src/lib/campaign-defaults";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {} } }));
});
for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
  const wizard = mode.startsWith("wizard");
  async function appearance(page: Page) { if (wizard) await selectWizardStep(page, 2); }
  async function gameType(page: Page, name: string) {
    if (wizard) await selectWizardStep(page, 0);
    await page.getByRole("button", { name: new RegExp(name) }).first().click();
    await appearance(page);
  }
  async function reopen(page: Page, saved: ReturnType<typeof parseCampaignSetupInput>) {
    const query = new URLSearchParams({ mode, template: "scratch-coral", business: "retail", background: saved.presentation.background.color,
      styles: JSON.stringify(saved.presentation.layout.wheelTemplateStyles) });
    await page.goto(`/dev/template-rendering-proof?${query}`);
    if (!wizard) await page.getByRole("switch", { name: "Activer le mode expert" }).click();
    await gameType(page, "Roue de la fortune");
    await expect(page.getByLabel("Couleur du logo et sous-titre", { exact: true })).toHaveValue("#aabbcc");
  }
  test(`${mode}: couleurs propres après navigation roue/ticket`, async ({ page }) => {
    test.setTimeout(90_000);
    if (!wizard) {
      await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=scratch-coral&business=retail&background=%23ffe1d1`);
      await page.getByRole("switch", { name: "Activer le mode expert" }).click();
      await gameType(page, "Roue de la fortune");
      const logo = page.getByLabel("Couleur du logo et sous-titre", { exact: true });
      await expect(logo).toHaveValue("#ffffff");
      await logo.fill("#aabbcc");
      await gameType(page, "Ticket à gratter");
      await page.getByRole("button", { name: /^Cadeau lilas/ }).click();
      await gameType(page, "Roue de la fortune");
      await expect(logo).toHaveValue("#aabbcc");
      await gameType(page, "Ticket à gratter");
      await page.getByRole("button", { name: /^Corail joyeux/ }).click();
      const request = page.waitForRequest(request => request.url().endsWith("/api/campaigns/setup") && request.method() === "POST");
      await page.getByRole("button", { name: "Enregistrer", exact: true }).last().click();
      const saved = parseCampaignSetupInput((await request).postDataJSON(), "fixture-merchant");
      expect(saved.presentation.background.color).toBe("#ffe1d1");
      expect(saved.presentation.layout.wheelTemplateStyles?.["scratch-lilac"]?.backgroundColor).toBe("#ffffff");
      expect(saved.presentation.layout.wheelTemplateStyles?.["cocorico-wheel"]?.logoTextColor).toBe("#aabbcc");
      await reopen(page, saved);
      return;
    }
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic&business=retail`);
    if (!wizard) await page.getByRole("switch", { name: "Activer le mode expert" }).click();
    await appearance(page);
    await page.getByRole("button", { name: /^Moderne/ }).click();
    const logo = page.getByLabel("Couleur du logo et sous-titre", { exact: true });
    const background = page.getByLabel("Couleur de fond", { exact: true }).last();
    await expect(logo).toHaveValue("#ffffff");
    // The default white must survive a complete cross-type round trip.
    await gameType(page, "Ticket à gratter");
    await gameType(page, "Roue de la fortune");
    await expect(logo).toHaveValue("#ffffff");
    await logo.fill("#aabbcc");
    await gameType(page, "Ticket à gratter");
    await page.getByRole("button", { name: /^Corail joyeux/ }).click();
    await expect(background).toHaveValue("#ffffff");
    await background.fill("#ffe1d1");
    await page.getByRole("button", { name: /^Cadeau lilas/ }).click();
    await expect(background).toHaveValue("#ffffff");
    await background.fill("#ebd1ff");
    await gameType(page, "Roue de la fortune");
    await expect(logo).toHaveValue("#aabbcc");
    await page.getByRole("button", { name: /^Bicolore/ }).click();
    await page.getByRole("button", { name: /^Moderne/ }).click();
    await expect(logo).toHaveValue("#aabbcc");
    await gameType(page, "Ticket à gratter");
    await expect(background).toHaveValue("#ebd1ff");
    await page.getByRole("button", { name: /^Corail joyeux/ }).click();
    await expect(background).toHaveValue("#ffe1d1");
    const request = page.waitForRequest(request => request.url().endsWith("/api/campaigns/setup") && request.method() === "POST");
    await page.getByRole("button", { name: wizard ? "Enregistrer le brouillon" : "Enregistrer", exact: true }).last().click();
    const saved = parseCampaignSetupInput((await request).postDataJSON(), "fixture-merchant");
    const styles = saved.presentation.layout.wheelTemplateStyles!;
    expect(styles["cocorico-wheel"]?.logoTextColor).toBe("#aabbcc");
    expect(styles["scratch-lilac"]?.backgroundColor).toBe("#ebd1ff");
    expect(saved.presentation.background.color).toBe("#ffe1d1");
    await reopen(page, saved);
  });
  test(`${mode}: Halloween conserve le titre initial et personnalisé`, async ({ page }) => {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic&business=retail&headline=${encodeURIComponent(DEFAULT_WHEEL_SUBTITLE)}`);
    await appearance(page);
    await page.getByRole("button", { name: /^Halloween doré/ }).click();
    if (wizard) await selectWizardStep(page, 1);
    const title = page.getByLabel(wizard ? /Promesse affichée au client/ : /Phrase affichée sur la page de jeu/, { exact: false }).first();
    await expect(title).toHaveValue(DEFAULT_WHEEL_SUBTITLE);
    await title.fill("Ma surprise\npersonnalisée");
    await appearance(page);
    await page.getByRole("button", { name: /^Moderne/ }).click();
    await page.getByRole("button", { name: /^Halloween doré/ }).click();
    if (wizard) await selectWizardStep(page, 1);
    await expect(title).toHaveValue("Ma surprise\npersonnalisée");
  });
}
