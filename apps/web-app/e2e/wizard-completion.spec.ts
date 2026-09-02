import { expect, test } from "@playwright/test";
import { signIn as cachedSignIn } from "./auth-session";

test.describe("Confirmation du Wizard", () => {
  test("un brouillon enregistré propose des actions de diffusion cohérentes", async ({ page }) => {
    await cachedSignIn(page);

    const title = `E2E — confirmation ${Date.now()}`;
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
    const completionActions = [
      savedDialog.getByRole("link", { name: "Télécharger le QR code de diffusion", exact: true }),
      savedDialog.getByRole("link", { name: "Prévisualiser", exact: true }),
      savedDialog.getByRole("button", { name: "QR de test", exact: true }),
      savedDialog.getByRole("link", { name: "Affiche", exact: true }),
    ];
    await Promise.all(completionActions.map((action) => expect(action).toBeVisible()));
    await expect(savedDialog.getByRole("button", { name: "Modifier le jeu", exact: true })).toHaveCount(0);
    await expect(
      savedDialog.getByRole("link", { name: "Modifier l'e-mail de gain", exact: true }),
    ).toHaveCount(0);

    const actionBoxes = await Promise.all(
      completionActions.map((action) =>
        action.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return {
            height: box.height,
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
          };
        }),
      ),
    );
    expect(
      actionBoxes.every((box) => box.height === 44 && box.scrollHeight <= box.clientHeight),
    ).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await Promise.all(completionActions.map((action) => expect(action).toBeVisible()));

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
