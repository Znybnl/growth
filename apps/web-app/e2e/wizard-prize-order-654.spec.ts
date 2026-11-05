import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

for (const template of ["classic", "scratch-nude-classic"]) {
  test(`@visual-1280 ${template} : règles et coût de revient lisibles sans budget`, async ({ page, context, baseURL }, info) => {
    await rejectAnalyticsForVisualTests(context, baseURL!);
    await page.route(/https:\/\//, route => route.abort());
    const writes: string[] = [];
    await page.route("**/api/**", route => {
      if (route.request().method() !== "GET") writes.push(route.request().url());
      return route.fulfill({ json: { suggestions: [], items: [], assets: {} } });
    });
    await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-edit&template=${template}`);
    await expect.poll(() => page.locator(".okado-wizard").evaluate(el => getComputedStyle(el).getPropertyValue("--wizard-toolbar-height").trim())).not.toBe("");
    await selectWizardStep(page, 3);
    const table = page.getByTestId("wizard-prize-table");
    const rules = page.getByTestId("wizard-prize-rules");
    const budget = page.getByTestId("wizard-prize-budget");
    await expect(budget).toHaveCount(0);
    expect(await table.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('[data-testid="wizard-prize-rules"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    const validity = await rules.getByLabel("Durée de validité du gain (jours)", { exact: false }).inputValue();
    const probability = await page.getByTestId("wizard-prize-row").first().getByRole("spinbutton").inputValue();

    for (const [width, height] of [[1280, 720], [1280, 600], [390, 844], [320, 844]]) {
      await page.setViewportSize({ width, height });
      await table.scrollIntoViewIfNeeded();
      const cost = width === 1280
        ? page.getByTestId("wizard-prize-table-header").getByText("Coût de revient", { exact: true })
        : page.getByTestId("wizard-prize-row").first().getByText("Coût de revient", { exact: true });
      await expect(cost).toBeVisible();
      await expect(table.getByText("Coût", { exact: true })).toHaveCount(0);
      if (width === 1280) {
        await expect(cost).toHaveCSS("text-align", "left");
        const box = await cost.boundingBox();
        const next = await page.getByTestId("wizard-prize-table-header").getByText("Actions", { exact: true }).boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(next!.x);
        await captureVisualAt1280(page, info, `cout-revient-${template}`, height);
      } else await page.screenshot({ path: info.outputPath(`cout-revient-${template}-${width}.png`) });
      await rules.scrollIntoViewIfNeeded();
      await expect(budget).toHaveCount(0);
      await expect(rules).toHaveAttribute("open", "");
      if (width === 1280) await captureVisualAt1280(page, info, `regles-sans-budget-${template}`, height);
      else await page.screenshot({ path: info.outputPath(`regles-sans-budget-${template}-${width}.png`) });
      await expect(rules.getByLabel("Durée de validité du gain (jours)", { exact: false })).toHaveValue(validity);
      await assertNoPageOverflow(page);
    }
    expect(await page.getByTestId("wizard-prize-row").first().getByRole("spinbutton").inputValue()).toBe(probability);
    expect(writes).toEqual([]);
  });
}
