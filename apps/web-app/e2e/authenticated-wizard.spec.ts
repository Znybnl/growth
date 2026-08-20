import { expect, test } from "@playwright/test";

test.describe("Parcours marchand authentifié", () => {
  test("un marchand peut accéder à l'assistant de création", async ({ page }) => {
    const email = process.env.OKADO_E2E_EMAIL;
    const password = process.env.OKADO_E2E_PASSWORD;
    test.skip(
      !email || !password,
      "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD pour exécuter ce parcours avec un compte de test dédié.",
    );

    await page.goto("/connexion");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15_000 });
    await page.goto("/campaigns/new/guided");
    await expect(page).not.toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: "Créer une campagne", exact: true })).toBeVisible();
    await expect(page.getByText("Progression", { exact: true })).toBeVisible();
  });
});
