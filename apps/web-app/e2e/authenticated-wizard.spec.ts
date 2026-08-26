import { expect, test } from "@playwright/test";

test.describe("Parcours marchand authentifié", () => {
  test("un marchand accède au Wizard depuis le seul bouton de création", async ({ page }) => {
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
    const createCampaign = page.getByRole("link", { name: "Créer une campagne", exact: true }).first();
    await expect(createCampaign).toHaveAttribute("href", "/campaigns/new/guided");
    await expect(page.getByRole("link", { name: "Assistant de création", exact: true })).toHaveCount(0);
    await createCampaign.click();
    await expect(page).not.toHaveURL(/\/onboarding/);
    await expect(page.getByRole("heading", { name: "Créer une campagne", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();
    await expect(page.getByText("Progression", { exact: true })).toBeVisible();
    await expect(page.getByText("En création", { exact: true })).toBeVisible();
    await expect(page.getByText("Jeu en brouillon", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("wizard-phone-preview")).toHaveCSS("width", "300px");
    await expect(page.getByTestId("wizard-phone-preview")).toHaveCSS("height", "600px");
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
    await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("E2E — catalogue de polices");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.getByRole("heading", { name: "L’apparence", exact: true })).toBeVisible();
    await expect(page.getByText("Bouton de jeu", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Fond du ticket", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Logo", { exact: true })).toBeVisible();
    await page.getByText("Paramètres avancés", { exact: false }).click();
    await expect(page.getByText("Fond", { exact: true })).toBeVisible();
    await expect(page.getByText("Réglages du texte", { exact: true })).toBeVisible();

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
