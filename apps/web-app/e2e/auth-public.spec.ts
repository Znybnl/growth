import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

  test("l’inscription Google demande l’acceptation des conditions", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByRole("button", { name: "S'inscrire avec Google" }).click();
    await expect(page.getByText("Vous devez accepter les conditions pour continuer.")).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeFocused();
    await expect(page).toHaveURL(/\/inscription/);
  });

  test("Google démarre le parcours existant après acceptation", async ({ page }) => {
    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Configuration Google non fournie au serveur de test");
    let startUrl = "";
    await page.route("**/api/auth/google/start**", route => { startUrl = route.request().url(); return route.fulfill({status:200,body:"Redirection simulée"}); });
    await page.goto("/inscription");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "S'inscrire avec Google" }).click();
    await expect.poll(() => startUrl).toContain("/api/auth/google/start");
    expect(new URL(startUrl).searchParams.get("next")).toBe("/onboarding");
  });

  test("les mots de passe non concordants sont signalés sans appel réseau", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/auth/signup", route => { calls++; return route.abort(); });
    await page.goto("/inscription");
    await page.getByPlaceholder("Camille", { exact: true }).fill("Camille");
    await page.getByPlaceholder("Martin").fill("Martin");
    await page.getByPlaceholder("camille@maisonsora.fr").fill("camille@example.com");
    const passwords = page.getByPlaceholder("••••••••••");
    await passwords.nth(0).fill("Motdepasse123!");
    await passwords.nth(1).fill("Motdepasse456!");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Les mots de passe ne correspondent pas.")).toBeVisible();
    await expect(passwords.nth(1)).toBeFocused();
    expect(calls).toBe(0);
    await page.getByRole("button", { name: "Afficher le mot de passe", exact: true }).click();
    await expect(passwords.nth(0)).toHaveAttribute("type", "text");
  });

  test("les champs manquants sont signalés et le premier reçoit le focus", async ({ page }) => {
    await page.goto("/inscription");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Renseignez votre prénom.")).toBeVisible();
    await expect(page.getByPlaceholder("Camille", {exact:true})).toBeFocused();
    await expect(page.getByText("Saisissez une adresse e-mail valide.")).toBeVisible();
  });

  test("l’inscription email conserve les données et masque les erreurs techniques", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/auth/signup", async route => { calls++; await route.fulfill({status:400,json:{error:"internal database detail"}}); });
    await page.goto("/inscription");
    await page.getByPlaceholder("Camille", {exact:true}).fill("Camille");
    await page.getByPlaceholder("Martin", {exact:true}).fill("Martin");
    await page.getByPlaceholder("camille@maisonsora.fr").fill("camille@example.com");
    await page.getByPlaceholder("••••••••••").nth(0).fill("Motdepasse123!");
    await page.getByPlaceholder("••••••••••").nth(1).fill("Motdepasse123!");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Une erreur est survenue. Veuillez réessayer.")).toBeVisible();
    await expect(page.getByText("internal database detail")).toHaveCount(0);
    await expect(page.getByPlaceholder("Camille", {exact:true})).toHaveValue("Camille");
    expect(calls).toBe(1);
  });

  test("l’inscription email envoie les informations et ouvre l’onboarding", async ({ page }) => {
    let submitted: Record<string, unknown> | undefined;
    await page.route("**/api/auth/signup", route => { submitted = route.request().postDataJSON(); return route.fulfill({status:201,json:{}}); });
    await page.route("**/onboarding", route => route.fulfill({status:200,contentType:"text/html",body:"<p>Onboarding simulé</p>"}));
    await page.goto("/inscription");
    await page.getByPlaceholder("Camille", {exact:true}).fill("Camille");
    await page.getByPlaceholder("Martin", {exact:true}).fill("Martin");
    await page.getByPlaceholder("camille@maisonsora.fr").fill("camille@example.com");
    await page.getByPlaceholder("••••••••••").nth(0).fill("Motdepasse123!");
    await page.getByPlaceholder("••••••••••").nth(1).fill("Motdepasse123!");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", {name:"Créer mon compte"}).click();
    await expect(page).toHaveURL(/\/onboarding/);
    expect(submitted).toMatchObject({firstName:"Camille",lastName:"Martin",email:"camille@example.com"});
  });

  for (const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:720},{width:1280,height:720}]) {
    test(`inscription responsive ${viewport.width} × ${viewport.height}`, async ({ page }, info) => {
      await page.setViewportSize(viewport);
      await page.goto("/inscription");
      await expect(page.getByRole("heading", { name: "Ouvrez votre espace marchand" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      if (viewport.width < 1024) await expect(page.getByRole("complementary", {name:"Découvrez Okado"})).toBeHidden();
      else {
        await expect(page.getByRole("complementary", {name:"Découvrez Okado"})).toBeVisible();
        await expect(page.getByText("Visuels et résultats fictifs, à titre illustratif.")).toBeVisible();
        expect(readFileSync(resolve(__dirname, "../../../.vercelignore"), "utf8")).toContain("!apps/web-app/public/images/auth/inscription-jeu.webp");
        const image = page.locator('img[src*="inscription-jeu"]');
        await expect(image).toHaveJSProperty("complete", true);
        expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
      }
      await page.screenshot({path:info.outputPath(`inscription-${viewport.width}.png`),fullPage:true,animations:"disabled"});
    });
  }

  for (const viewport of [{width:390,height:844},{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]) {
    for (const route of ["inscription", "connexion"]) {
      test(`contraste et mise en page ${route} ${viewport.width} × ${viewport.height}`, async ({page}, info) => {
        await page.setViewportSize(viewport);
        await page.goto(`/${route}`);
        const field = route === "inscription" ? page.getByPlaceholder("Camille", {exact:true}) : page.getByPlaceholder("Email", {exact:true});
        await expect(field).toHaveCSS("height", "46px");
        await expect(field).toHaveCSS("border-top-color", "rgb(203, 197, 207)");
        expect(await field.evaluate(element => getComputedStyle(element, "::placeholder").color)).toBe("rgb(118, 112, 125)");
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
        if (viewport.width >= 1024) {
          const art = await page.getByTestId("auth-promo-art").boundingBox();
          const copy = await page.getByTestId("auth-promo-copy").boundingBox();
          expect(copy!.y).toBeGreaterThanOrEqual(art!.y + art!.height + 20);
        }
        if (route === "inscription" && viewport.width === 1440) {
          const button = await page.getByRole("button", {name:"Créer mon compte"}).boundingBox();
          expect(button!.y + button!.height).toBeLessThanOrEqual(viewport.height);
        }
        await page.screenshot({path:info.outputPath(`${route}-${viewport.width}x${viewport.height}.png`),fullPage:true,animations:"disabled"});
      });
    }
  }
});
