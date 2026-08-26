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

test.describe("Confirmation du Wizard", () => {
  test("un brouillon enregistré propose des actions de diffusion cohérentes", async ({ page }) => {
    await signIn(page);

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

    const completionActions = [
      page.getByRole("link", { name: "Prévisualiser", exact: true }),
      page.getByRole("button", { name: "Options du QR code", exact: true }),
      page.getByRole("link", { name: "Affiche", exact: true }),
    ];
    await Promise.all(completionActions.map((action) => expect(action).toBeVisible()));
    await expect(page.getByRole("link", { name: "Modifier le jeu", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Modifier l'e-mail de gain", exact: true }),
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
      .click();
    await expect(campaignCard).toBeHidden({ timeout: 15_000 });
  });
});
