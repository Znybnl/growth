import { expect, type Page } from "@playwright/test";

/** Same access rules, two accessible presentations according to workspace width. */
export async function selectWizardStep(page: Page, index: number) {
  const wizard = page.locator(".okado-wizard");
  // Mobile SSR already says "narrow". Wait for the existing layout effect so
  // selectOption cannot run before React has attached the change handler.
  await expect.poll(() => wizard.evaluate(node => node.style.getPropertyValue("--wizard-toolbar-height")), { timeout: 15_000 }).not.toBe("");
  const width = (await wizard.boundingBox())!.width;
  await expect(wizard).toHaveAttribute("data-layout", width >= 1200 ? "wide" : width >= 900 ? "compact" : "narrow");
  const select = page.getByRole("combobox", { name: "Étape de création" });
  if (await wizard.getAttribute("data-layout") === "narrow") {
    await expect(select).toBeVisible();
    await select.selectOption(String(index));
  } else {
    const stepButton = page.getByRole("navigation", { name: "Étapes de création" }).getByRole("button").nth(index);
    await expect(stepButton).toBeVisible();
    await expect(stepButton).toBeEnabled();
    await stepButton.click();
  }
}
