import { expect, test, type Page } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { id: "fixture-saved" }, suggestions: [], items: [], assets: {} } }));
});
const validity = (page: Page) => page.getByLabel(/^Durée de validité du gain/);
const interval = (page: Page) => page.getByLabel(/^Délai minimum entre deux participations/);
async function save(page: Page) {
  const request = page.waitForRequest(request => request.url().endsWith("/api/campaigns/setup") && request.method() === "POST");
  await page.getByTestId("wizard-footer").getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
  return (await request).postDataJSON();
}
for (const [business, days, gap, afterHours] of [["beauty", 60, 7, 24], ["retail", 30, 7, 24], ["restaurant", 30, 7, 24], ["travel", 30, 7, 0]] as const) {
  test(`nouveau wizard ${business}: règles initiales ${days}/${gap} et valeurs saisies conservées`, async ({ page }) => {
    await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-create&business=${business}`);
    await page.getByTestId("wizard-footer").getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByLabel(/Nom de l.animation/).fill("Jeu de test");
    await page.getByTestId("wizard-footer").getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByTestId("wizard-footer").getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(validity(page)).toHaveValue(String(days));
    await expect(interval(page)).toHaveValue(String(gap));
    const nextDay = page.getByRole("checkbox", { name: /Le gain est utilisable à partir du lendemain/ });
    expect(await nextDay.isChecked()).toBe(afterHours > 0);
    await validity(page).fill("42"); await interval(page).fill("3");
    const saved = await save(page);
    expect(saved.rewardRules).toMatchObject({ availabilityDurationDays: 42, participationIntervalDays: 3, availableAfterHours: afterHours });
  });
}
test("campagne Voyage existante : les règles enregistrées restent inchangées", async ({ page }) => {
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit-custom-rules&business=travel");
  await selectWizardStep(page, 3);
  await expect(interval(page)).toHaveValue("13");
  await expect(page.getByRole("checkbox", { name: /Le gain est utilisable à partir du lendemain/ })).toBeChecked();
  const saved = await save(page);
  expect(saved.rewardRules).toMatchObject({ availabilityDurationDays: 91, participationIntervalDays: 13, availableAfterHours: 24 });
});
for (const [mode, days, gap] of [["wizard-responsive-edit", 0, 1], ["wizard-responsive-edit-legacy-rules", 30, 1], ["wizard-responsive-edit-custom-rules", 91, 13]] as const) {
  test(`campagne Beauté existante ${days}/${gap}: aucune réinitialisation`, async ({ page }) => {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&business=beauty`);
    await selectWizardStep(page, 3);
    await expect(validity(page)).toHaveValue(String(days));
    await expect(interval(page)).toHaveValue(String(gap));
    const saved = await save(page);
    expect(saved.rewardRules).toMatchObject({ availabilityDurationDays: days, participationIntervalDays: gap });
  });
}
test("@visual-1280 règles épurées : infobulle au clic et au clavier, budget absent", async ({ page }, info) => {
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&business=beauty");
  await selectWizardStep(page, 3);
  const checkbox = page.getByRole("checkbox", { name: "Jeu 100 % gagnant", exact: true });
  const rule = page.locator("#wizard-winning-game-rule");
  const label = page.locator('label[for="wizard-winning-game"]');
  const labelBox = (await label.boundingBox())!;
  const ruleBox = (await rule.boundingBox())!;
  expect(ruleBox.y - (labelBox.y + labelBox.height)).toBeLessThanOrEqual(8);
  const initial = await checkbox.isChecked();
  const trigger = page.getByRole("button", { name: "À propos du jeu 100 % gagnant", exact: true });
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeHidden();
  await expect(page.getByTestId("wizard-prize-budget")).toHaveCount(0);
  for (const [width, height] of [[1280, 720], [1280, 600], [390, 844], [320, 844]]) {
    await page.setViewportSize({ width, height });
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Un lot à 0 % ne peut pas être gagné.");
    const box = (await tooltip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    if (width === 1280) await captureVisualAt1280(page, info, "infobulle-regles", height);
    else await page.screenshot({ path: info.outputPath(`infobulle-${width}.png`) });
    await page.keyboard.press("Escape");
    await expect(tooltip).toBeHidden();
    expect(await checkbox.isChecked()).toBe(initial);
    await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await assertNoPageOverflow(page);
  }
});
