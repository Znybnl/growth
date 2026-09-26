import { expect, test } from "@playwright/test";

import { signIn } from "./auth-session";

test("Dynamique déborde et Signature reste contenue sans perdre les couleurs personnalisées", async ({ page }, testInfo) => {
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

  await page.getByRole("button", { name: /^Dynamique\b/ }).click();
  await page.getByTestId("wizard-phone-preview").screenshot({ path: testInfo.outputPath("dynamique-default.png") });
  await expect(page.getByLabel("Couleur du texte principal").first()).toHaveValue("#ffffff");
  const secondary = page.getByLabel("Couleur secondaire").first();
  await expect(secondary).toBeVisible();
  await secondary.fill("#f0dcbb");
  await expect(secondary).toHaveValue("#f0dcbb");
  await page.getByLabel("Couleur principale").first().fill("#182d60");
  await expect(secondary).toHaveValue("#f0dcbb");
  const dynamicWheel = page.getByTestId("wizard-phone-preview").locator('svg[viewBox="0 0 640 640"]');
  const dynamicFills = await dynamicWheel.locator("path[fill]").evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("fill")),
  );
  expect(dynamicFills).toContain("#182d60");
  expect(dynamicFills).toContain("#f0dcbb");
  const dynamicBounds = await dynamicWheel.boundingBox();
  await page.getByTestId("wizard-phone-preview").screenshot({ path: testInfo.outputPath("dynamique.png") });

  await page.getByRole("button", { name: /^Signature\b/ }).click();
  const signatureBounds = await page.getByTestId("wizard-phone-preview").locator('svg[viewBox="0 0 640 640"]').boundingBox();
  expect(dynamicBounds?.width).toBeGreaterThan(300);
  expect(signatureBounds?.width).toBeLessThan(300);
  await page.getByTestId("wizard-phone-preview").screenshot({ path: testInfo.outputPath("signature.png") });
  await page.getByRole("button", { name: /^Dynamique\b/ }).click();
  await expect(page.getByLabel("Couleur secondaire").first()).toHaveValue("#f0dcbb");
});
