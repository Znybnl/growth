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

test.describe("Suppression d’un jeu", () => {
  test("un marchand confirme puis supprime un brouillon de test", async ({ page }) => {
    await signIn(page);

    const title = `E2E — suppression ${Date.now()}`;
    await page.goto("/campaigns/new/guided");
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill(title);
    await page
      .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog", { name: "Brouillon enregistré" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(`/campaigns?q=${encodeURIComponent(title)}`);
    const campaignCard = page.locator("article").filter({ hasText: title });
    await expect(campaignCard).toBeVisible({ timeout: 15_000 });

    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Supprimer ce jeu ?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(title, { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(8, 8);
    await expect(dialog).toBeHidden();

    await campaignCard.getByRole("button", { name: "Ouvrir les actions de la campagne" }).click();
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await dialog.getByRole("button", { name: "Supprimer définitivement" }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(campaignCard).toBeHidden({ timeout: 15_000 });
  });
});
