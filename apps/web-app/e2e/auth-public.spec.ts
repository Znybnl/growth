import { expect, test } from "@playwright/test";

test.describe("Parcours public d'authentification", () => {
  test("la page de connexion est accessible", async ({ page }) => {
    await page.goto("/connexion");

    await expect(page.getByRole("heading", { name: "Bienvenue" })).toBeVisible();
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Créer un compte" })).toBeVisible();
  });

  test("la connexion affiche une erreur lisible lorsque les identifiants sont refusés", async ({ page }) => {
    await page.route("**/api/auth/signin", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Identifiants invalides." }),
      });
    });

    await page.goto("/connexion");
    await page.getByPlaceholder("Email").fill("joueur-test@example.com");
    await page.getByPlaceholder("Mot de passe").fill("mot-de-passe-invalide");
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();

    await expect(page.getByText("Identifiants invalides.", { exact: true })).toBeVisible();
  });

  test("la page d'inscription bloque une inscription sans acceptation des conditions", async ({ page }) => {
    let signupRequests = 0;
    await page.route("**/api/auth/signup", route => { signupRequests++; return route.fulfill({ status: 400, json: { error: "Ne doit pas être envoyé" } }); });
    await page.goto("/inscription");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    await expect(page.getByRole("link", { name: "conditions générales de vente et d’abonnement" })).toHaveAttribute("href", "https://www.okado.app/cgv");
    await expect(page.getByRole("link", { name: "politique de confidentialité" })).toHaveAttribute("href", "https://www.okado.app/confidentialite");
    await expect(page.getByText("je souhaite recevoir les conseils", { exact: false })).toHaveCount(0);

    await page.locator('input[placeholder="Camille"]').fill("Camille");
    await page.locator('input[placeholder="Martin"]').fill("Martin");
    await page.locator('input[placeholder="camille@maisonsora.fr"]').fill("camille@example.com");
    await page.locator('input[placeholder="••••••••••"]').nth(0).fill("Motdepasse123!");
    await page.locator('input[placeholder="••••••••••"]').nth(1).fill("Motdepasse123!");
    await page.getByRole("checkbox").uncheck();
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page.getByText("Vous devez accepter les conditions pour continuer.")).toBeVisible();
    expect(signupRequests).toBe(0);
  });
});
