import { expect, test } from "@playwright/test";

const email = process.env.OKADO_E2E_EMAIL;
const password = process.env.OKADO_E2E_PASSWORD;
const hasDedicatedTestAccount = Boolean(email && password);

test.describe("Parcours marchand authentifié", () => {
  test.skip(
    !hasDedicatedTestAccount,
    "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD pour exécuter ce parcours avec un compte de test dédié.",
  );

  test("un marchand peut accéder à l'assistant de création", async ({ page }) => {
    await page.goto("/connexion");
    await page.getByPlaceholder("Email").fill(email!);
    await page.getByPlaceholder("Mot de passe").fill(password!);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15_000 });
    await page.goto("/campaigns/new/guided");
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByText("Progression")).toBeVisible();
  });
});
