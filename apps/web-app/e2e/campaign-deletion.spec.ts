import { expect, test } from "@playwright/test";
import { signIn as cachedSignIn } from "./auth-session";

test.describe("Suppression d’un jeu", () => {
  test("un marchand confirme puis supprime un brouillon de test", async ({ page }) => {
    await cachedSignIn(page);

    const title = `E2E — suppression ${Date.now()}`;
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

    await page.goto(`/campaigns?q=${encodeURIComponent(title)}`);
    const campaignCard = page.locator("article").filter({ hasText: title });
    await expect(campaignCard).toBeVisible({ timeout: 15_000 });

    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Supprimer ce jeu ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(title);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();

    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await dialog.getByRole("button", { name: "Supprimer définitivement" }).click({ force: true });
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(campaignCard).toBeHidden({ timeout: 15_000 });
  });
});
