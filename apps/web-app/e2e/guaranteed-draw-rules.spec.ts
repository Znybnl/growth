import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});
test("@visual-1280 règles 100 % : case sans répartition automatique, aide lisible dans le wizard", async ({ page }, info) => {
  for (const size of [{width:1280,height:720},{width:1280,height:600},{width:390,height:740},{width:320,height:740}]) {
    await page.setViewportSize(size);
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=classic");
    await selectWizardStep(page,3);
    const chances=page.getByTestId("wizard-prize-table").getByRole("spinbutton");
    const before=await chances.evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
    expect(before.length).toBeGreaterThan(0);
    const rules=page.getByTestId("wizard-prize-rules");
    await expect(rules).toHaveJSProperty("open", true);
    const checkbox=rules.getByRole("checkbox",{name:/Jeu 100 % gagnant/});
    await checkbox.check();
    await expect(rules.getByText(/réparties proportionnellement/)).toBeVisible();
    await expect(rules.getByText(/Un lot à 0 % ne peut pas être gagné/)).toBeVisible();
    const after=await chances.evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
    expect(after).toEqual(before);
    await rules.scrollIntoViewIfNeeded();
    await assertNoPageOverflow(page);
    if(size.width===1280) await captureVisualAt1280(page,info,"guaranteed-draw-rules",size.height);
    else await page.screenshot({path:info.outputPath(`rules-${size.width}.png`),fullPage:true});
    await checkbox.uncheck();
  }
});
test("@visual-1280 réglages avancés ouverts, espacements en dernier et import du fond sous forme de bouton", async ({ page }, info) => {
  for (const size of [{ width: 1280, height: 720 }, { width: 390, height: 740 }]) {
    await page.setViewportSize(size);
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=scratch-nude-classic");
    await selectWizardStep(page, 2);

    const advanced = page.getByRole("region", { name: "Paramètres avancés" });
    await expect(advanced).toBeVisible();
    const subtitleSpacing = page.getByRole("slider", { name: "Espacement entre le titre et le sous-titre du ticket (px)" });
    const scratchSpacing = page.getByRole("slider", { name: "Espacement entre le texte et la zone à gratter (px)" });
    await expect(subtitleSpacing).toBeVisible();
    await expect(scratchSpacing).toBeVisible();
    expect(await subtitleSpacing.evaluate((element) => {
      const next = document.querySelector('[aria-label="Espacement entre le texte et la zone à gratter (px)"]');
      return Boolean(next && (element.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING));
    })).toBe(true);

    const logoSection = page.locator("section").filter({ has: page.getByText("Logo", { exact: true }) }).first();
    await logoSection.getByRole("button", { name: "Image", exact: true }).click();
    await expect(page.getByText("Importer votre logo")).toBeVisible();
    const logoSize = page.getByRole("slider", { name: "Taille du logo" });
    await expect(logoSize).toHaveValue("100");

    await advanced.getByRole("button", { name: "Image", exact: true }).click();
    await expect(advanced.getByRole("group", { name: "Choisir une image de fond" }).getByText("Importer une image de fond")).toBeVisible();
    await expect(advanced.getByRole("button", { name: "Choisir dans la bibliothèque" })).toBeVisible();
    await assertNoPageOverflow(page);
    if (size.width === 1280) await captureVisualAt1280(page, info, "wizard-advanced-scratch-spacing");
    else await page.screenshot({ path: info.outputPath("wizard-advanced-mobile.png"), fullPage: true });
  }
});
test("@visual-1280 explication présente aussi dans l’éditeur classique", async ({ page }, info) => {
  await page.setViewportSize({width:1280,height:720});
  await page.goto("/dev/template-rendering-proof?mode=editor&template=classic");
  const help=page.getByText(/Cocher cette case ne modifie pas les chances saisies/);
  await help.scrollIntoViewIfNeeded();
  await expect(help).toBeVisible();
  await captureVisualAt1280(page,info,"guaranteed-draw-classic");
});
