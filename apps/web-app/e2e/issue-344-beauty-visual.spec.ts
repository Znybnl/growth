import { expect, test } from "@playwright/test";
import { signIn } from "./auth-session";

test("Éclat garde un titre allégé dans le vrai wizard", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle visuel Éclat");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByRole("button", { name: /Éclat Roue lumineuse/ }).click();
  const surface = page.locator('.okado-preview-surface[data-template-id="rose-institut"]');
  await expect(surface).toBeVisible();
  await expect(surface.locator("h3")).toHaveCSS("font-weight", "600");
  const wheel = await surface.locator(".okado-wheel-center-button").locator("..").boundingBox();
  const preview = await surface.boundingBox();
  expect(wheel).not.toBeNull();
  expect(preview).not.toBeNull();
  expect(wheel!.x).toBeGreaterThanOrEqual(preview!.x - 1);
  expect(wheel!.x + wheel!.width).toBeLessThanOrEqual(preview!.x + preview!.width + 1);
  await surface.screenshot({ path: testInfo.outputPath("eclat-wizard.png") });
});
