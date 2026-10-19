import { expect, type Page } from "@playwright/test";

/** Same access rules, two accessible presentations according to workspace width. */
export async function selectWizardStep(page: Page, index: number) {
  const wizard = page.locator(".okado-wizard");
  const width = (await wizard.boundingBox())!.width;
  await expect(wizard).toHaveAttribute("data-layout", width >= 1200 ? "wide" : width >= 900 ? "compact" : "narrow");
  const select = page.getByRole("combobox", { name: "Étape de création" });
  if (await select.isVisible()) await select.selectOption(String(index));
  else await page.getByRole("navigation", { name: "Étapes de création" }).getByRole("button").nth(index).click();
}
