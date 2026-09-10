import { expect, test } from "@playwright/test";
import { signIn as cachedSignIn } from "./auth-session";

test.describe("Statut de campagne après l’affiche", () => {
  test("conserve une campagne publiée après la sauvegarde de l’affiche", async ({ page }) => {
    await cachedSignIn(page);

    const title = `E2E — statut affiche ${Date.now()}`;
    await page.goto("/campaigns/new/guided");
    await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();

    for (let step = 0; step < 4; step += 1) {
      await page.getByRole("button", { name: "Continuer", exact: true }).click();
      if (step === 0) {
        await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(title);
      }
    }

    await page.getByRole("button", { name: "Publier la campagne", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Votre jeu est enregistré.", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const savedDialog = page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true });
    await savedDialog.getByRole("link", { name: "Affiche", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Personnaliser l’affiche A4 / A5", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByText("Affiche enregistrée.", { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: "Revenir à la campagne", exact: true }).click();

    await expect(page.getByText("En ligne", { exact: true })).toBeVisible();

    const campaignId = page.url().match(/\/campaigns\/([^/]+)\/edit\/guided/)?.[1];
    if (!campaignId) throw new Error("Identifiant de campagne absent de l’URL");
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
