import { expect, test } from "@playwright/test";

import { signIn } from "./auth-session";

test("Classique conserve ses deux couleurs et Dynamique garde une roue immersive lisible", async ({ page }, testInfo) => {
  if (!process.env.OKADO_E2E_EMAIL || !process.env.OKADO_E2E_PASSWORD) {
    test.skip(true, "Compte de test marchand non configuré.");
    return;
  }

  await page.setViewportSize({ width: 1366, height: 850 });
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Vérification visuelle des roues");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  await page.getByRole("button", { name: /^Classique\b/ }).click();
  const secondary = page.getByLabel("Couleur secondaire").first();
  await expect(secondary).toBeVisible();
  await secondary.fill("#f0dcbb");
  await expect(secondary).toHaveValue("#f0dcbb");
  await page.getByLabel("Couleur principale").first().fill("#182d60");
  await expect(secondary).toHaveValue("#f0dcbb");
  const classicWheel = page.getByTestId("wizard-phone-preview").locator('svg[viewBox="0 0 640 640"]');
  const classicFills = await classicWheel.locator("path[fill]").evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("fill")),
  );
  expect(classicFills).toContain("#182d60");
  expect(classicFills).toContain("#f0dcbb");
  const classicBounds = await classicWheel.boundingBox();
  await page.getByTestId("wizard-phone-preview").screenshot({ path: testInfo.outputPath("classique.png") });

  await page.getByRole("button", { name: /^Dynamique\b/ }).click();
  const dynamicBounds = await page.getByTestId("wizard-phone-preview").locator('svg[viewBox="0 0 640 640"]').boundingBox();
  expect(classicBounds?.width).toBeLessThan(300);
  expect(dynamicBounds?.width).toBeGreaterThan(300);
  await page.getByTestId("wizard-phone-preview").screenshot({ path: testInfo.outputPath("dynamique.png") });
  await page.getByRole("button", { name: /^Classique\b/ }).click();
  await expect(page.getByLabel("Couleur secondaire").first()).toHaveValue("#f0dcbb");
});
