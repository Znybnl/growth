import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  const email = process.env.OKADO_E2E_EMAIL;
  const password = process.env.OKADO_E2E_PASSWORD;
  test.skip(
    !email || !password,
    "Définissez OKADO_E2E_EMAIL et OKADO_E2E_PASSWORD pour exécuter ce parcours avec le compte de test dédié.",
  );

  await page.goto("/connexion");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15_000 });
}

test.describe("Navigation du Wizard en modification", () => {
  test("un marchand peut ouvrir chaque étape d’un jeu existant", async ({ page }) => {
    await signIn(page);

    const title = `E2E — modification ${Date.now()}`;
    await page.goto("/campaigns/new/guided");
    await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(title);
    await page
      .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog", { name: "Brouillon enregistré" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("dialog", { name: "Brouillon enregistré" })
      .getByRole("button", { name: "Continuer", exact: true })
      .click();

    const editLink = page.getByRole("link", { name: "Modifier le jeu", exact: true });
    await expect(editLink).toBeVisible();
    await editLink.click();
    await expect(page.getByRole("heading", { name: "Créer une campagne", exact: true })).toBeVisible();

    const steps = [
      { button: /Le jeu/, heading: "Le jeu" },
      { button: /La promesse/, heading: "La promesse" },
      { button: /L’apparence/, heading: "L’apparence" },
      { button: /Les lots/, heading: "Les lots" },
      { button: /L’action/, heading: "L’action" },
    ];

    for (const step of steps) {
      const stepButton = page.getByRole("button", { name: step.button });
      await expect(stepButton).toBeEnabled();
      await stepButton.click();
      await expect(page.getByRole("heading", { name: step.heading, exact: true })).toBeVisible();
    }

    await page.setViewportSize({ width: 390, height: 844 });
    for (const step of steps) {
      await expect(page.getByRole("button", { name: step.button })).toBeEnabled();
    }

    await page.goto(`/campaigns?q=${encodeURIComponent(title)}`);
    const campaignCard = page.locator("article").filter({ hasText: title });
    await expect(campaignCard).toBeVisible({ timeout: 15_000 });
    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await page.getByRole("dialog", { name: "Supprimer ce jeu ?" })
      .getByRole("button", { name: "Supprimer définitivement" })
      .click();
    await expect(campaignCard).toBeHidden({ timeout: 15_000 });
  });
});
