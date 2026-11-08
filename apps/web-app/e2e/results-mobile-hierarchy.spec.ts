import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test("Résultats : contexte et recherche des contacts restent lisibles", async ({ page, context, baseURL }, info) => {
  test.setTimeout(180_000);
  const email = process.env.OKADO_E2E_EMAIL;
  const password = process.env.OKADO_E2E_PASSWORD;
  test.skip(!email || !password, "Compte de recette requis");
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto("/connexion");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/");
  for (const [width, height] of [[320, 568], [390, 740], [412, 844], [1280, 600], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/data", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Résultats", exact: true })).toBeVisible();
    const input = page.getByLabel("Rechercher dans les contacts de cette campagne");
    await expect(input).toBeVisible();
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`resultats-${width}x${height}.png`), fullPage: true });
  }
  const input = page.getByLabel("Rechercher dans les contacts de cette campagne");
  await input.fill("code-inexistant-764");
  await input.press("Enter");
  await expect(page).toHaveURL(/q=code-inexistant-764/);
  await expect(page.getByText(/Aucun résultat pour/)).toBeVisible();
  await page.getByRole("link", { name: "Effacer" }).click();
  await expect(page).not.toHaveURL(/q=code-inexistant-764/);
});
