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

  test("le Wizard propose le catalogue de polices et Roboto par défaut", async ({ page }) => {
    const email = process.env.OKADO_E2E_EMAIL;
    const password = process.env.OKADO_E2E_PASSWORD;
    test.skip(
      !email || !password,
      "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD pour exécuter ce parcours avec un compte de test dédié.",
    );

    await page.setViewportSize({ width: 1600, height: 1200 });

    await page.goto("/connexion");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Mot de passe").fill(password);
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15_000 });

    await page.goto("/campaigns/new/guided");
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("E2E — catalogue de polices");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "L’apparence", exact: true })).toBeVisible();

    const fontSelect = page.locator('select:has(option[value="roboto"])').first();
    await expect(fontSelect).toHaveValue("roboto");
    await expect(fontSelect.locator("option")).toHaveText([
      "Roboto",
      "Geogrotesque",
      "Comfortaa",
      "Days One",
      "Delius Unicase",
      "Lato",
      "Lobster",
      "Pacifico",
      "Syncopate",
    ]);
  });
});
