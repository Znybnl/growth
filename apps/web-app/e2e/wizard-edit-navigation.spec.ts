import { expect, test } from "@playwright/test";
import { signIn as cachedSignIn } from "./auth-session";

test.describe("Navigation du Wizard en modification", () => {
  test("un marchand peut ouvrir chaque étape d’un jeu existant", async ({ page }) => {
    await cachedSignIn(page);

    const title = `E2E — modification ${Date.now()}`;
    await page.goto("/campaigns/new/guided");
    await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(title);
    await page
      .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
      .last()
      .click();
    await expect(page.getByRole("heading", { name: "Votre jeu est enregistré." })).toBeVisible({
      timeout: 15_000,
    });

    const savedDialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    await expect(savedDialog).toBeVisible();
    const completionUrl = page.url();
    await savedDialog.getByRole("button", { name: "Modifier le jeu", exact: true }).click();
    await expect(savedDialog).toBeHidden();
    expect(page.url()).toBe(completionUrl);
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
      .click({ force: true });
    await expect(campaignCard).toBeHidden({ timeout: 15_000 });
  });
});
