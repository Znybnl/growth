import { expect, test } from "@playwright/test";

import { signIn as cachedSignIn } from "./auth-session";

test.describe("Gestion des établissements", () => {
  test("autorise la création sans ville", async ({ page }) => {
    const email = process.env.OKADO_E2E_EMAIL;
    const password = process.env.OKADO_E2E_PASSWORD;
    if (!email || !password) {
      test.skip(true, "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD pour exécuter ce parcours avec le compte de test dédié.");
      return;
    }

    await cachedSignIn(page);
    await page.goto("/account#account-establishment");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ajouter un établissement", exact: true })).toBeVisible();

    await page.route("**/api/merchant/locations", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ merchant: { id: "merchant-test-location" } }),
      });
    });

    await page.getByPlaceholder("Maison Sora République").fill("Établissement sans ville");
    const requestPromise = page.waitForRequest("**/api/merchant/locations");
    await page.getByRole("button", { name: "Créer l’établissement", exact: true }).click();
    const request = await requestPromise;

    expect(JSON.parse(request.postData() ?? "{}")).toMatchObject({
      companyName: "Établissement sans ville",
      city: "",
    });
  });
});
