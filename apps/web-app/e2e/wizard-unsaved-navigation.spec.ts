import { expect, test } from "@playwright/test";
import { signIn as cachedSignIn } from "./auth-session";

async function openModifiedWizard(page: Parameters<typeof cachedSignIn>[0], title: string) {
  await cachedSignIn(page);
  await page.goto("/campaigns/new/guided");
  await expect(page.getByRole("heading", { name: "Le jeu", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(title);
}

test.describe("Protection des modifications non enregistrées du wizard", () => {
  test("permet d’annuler puis de quitter sans enregistrer depuis le menu", async ({ page }) => {
    await openModifiedWizard(page, `E2E — garde abandon ${Date.now()}`);

    const dialog = page.getByRole("dialog", { name: "Quitter le wizard ?", exact: true });
    const campaignsLink = page.getByRole("link", { name: "Mes jeux", exact: true }).first();

    await campaignsLink.click();
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/campaigns\/new\/guided/);
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByPlaceholder("Ex. La roue gourmande de juin")).toHaveValue(/E2E — garde abandon/);

    await campaignsLink.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Quitter sans enregistrer", exact: true }).click();
    await expect(page).toHaveURL(/\/campaigns(?:\?|$)/);
  });

  test("enregistre avant de quitter depuis le menu", async ({ page }) => {
    const title = `E2E — garde sauvegarde ${Date.now()}`;
    await openModifiedWizard(page, title);

    const dialog = page.getByRole("dialog", { name: "Quitter le wizard ?", exact: true });
    await page.getByRole("link", { name: "Mes jeux", exact: true }).first().click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Enregistrer et quitter", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/campaigns(?:\?|$)/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Toutes vos campagnes", exact: true })).toBeVisible();
  });
});
