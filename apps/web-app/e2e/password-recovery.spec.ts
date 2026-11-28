import { expect, test } from "@playwright/test";

test.describe("Récupération du mot de passe marchand", () => {
  test("le lien reste près du mot de passe et préremplit l’adresse sans URL", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/connexion");
    await page.getByLabel("Adresse e-mail").fill("camille@example.com");
    await page.getByRole("checkbox", { name: "Se souvenir de moi" }).uncheck();
    await expect(page.getByRole("link", { name: "Mot de passe oublié ?" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("login-password-recovery-link.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("login-password-recovery-link-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page).toHaveURL(/\/mot-de-passe-oublie$/);
    await expect(page.getByLabel("Adresse e-mail")).toHaveValue("camille@example.com");
    expect(page.url()).not.toContain("camille@example.com");
  });

  test("l’adresse invalide est refusée par le navigateur sans appel réseau", async ({ page }, testInfo) => {
    let requests = 0;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/auth/recovery/request", async (route) => {
      requests += 1;
      await route.fulfill({ status: 200, json: { accepted: true } });
    });
    await page.goto("/mot-de-passe-oublie");
    await page.screenshot({ path: testInfo.outputPath("request-form-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("request-form-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Adresse e-mail").fill("adresse-invalide");
    await page.getByRole("button", { name: "Envoyer le lien de réinitialisation" }).click();
    await expect(page.getByLabel("Adresse e-mail")).toBeFocused();
    expect(requests).toBe(0);
  });

  test("la confirmation reste identique et ne montre aucune information de compte", async ({ page }) => {
    let submitted: Record<string, unknown> | undefined;
    await page.route("**/api/auth/recovery/request", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { accepted: true } });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Adresse e-mail").fill("inconnu@example.test");
    await page.getByRole("button", { name: "Envoyer le lien de réinitialisation" }).click();
    await expect(page.getByRole("heading", { name: "Vérifiez votre boîte e-mail" })).toBeVisible();
    await expect(page.getByText(/Si un compte Okado est associé à cette adresse/)).toBeVisible();
    await expect(page.getByText(/Google uniquement|Cet e-mail existe/)).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("request-confirmation-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: test.info().outputPath("request-confirmation-desktop.png"), fullPage: true });
    expect(submitted).toEqual({ email: "inconnu@example.test" });
  });

  test("les demandes trop fréquentes ont un message générique", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/auth/recovery/request", (route) =>
      route.fulfill({ status: 429, headers: { "Retry-After": "60" }, json: { error: "rate_limited" } }),
    );
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Adresse e-mail").fill("camille@example.com");
    await page.getByRole("button", { name: "Envoyer le lien de réinitialisation" }).click();
    await expect(page.getByRole("heading", { name: "Veuillez patienter" })).toBeVisible();
    await expect(page.getByText(/Vous avez récemment demandé un lien/)).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("request-rate-limited-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("request-rate-limited-desktop.png"), fullPage: true });
  });

  test("l’accès direct sans fragment ne présente pas de formulaire de mot de passe", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/reinitialiser-mot-de-passe");
    await expect(page.getByRole("heading", { name: "Ce lien n’est plus valide" })).toBeVisible();
    await expect(page.getByLabel("Nouveau mot de passe")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("invalid-link-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath("invalid-link-mobile.png"), fullPage: true });
  });

  test("le fragment est nettoyé et le jeton n’est envoyé qu’à la soumission", async ({ page }, testInfo) => {
    let submitted: Record<string, unknown> | undefined;
    await page.route("**/api/auth/recovery/complete", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { completed: true, sessionsRevoked: true } });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/reinitialiser-mot-de-passe#token_hash=one-time-secret&type=recovery");
    await expect(page.getByRole("heading", { name: "Définissez votre nouveau mot de passe" })).toBeVisible();
    await expect(page).toHaveURL(/\/reinitialiser-mot-de-passe$/);
    await expect(page.getByLabel("Nouveau mot de passe", { exact: true })).toHaveAttribute("autocomplete", "new-password");
    await page.screenshot({ path: testInfo.outputPath("new-password-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("new-password-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });

    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("nouveau-secret-de-test");
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill("autre-secret");
    await page.getByRole("button", { name: "Enregistrer mon nouveau mot de passe" }).click();
    await expect(page.locator('p[role="alert"]')).toHaveText("Les deux mots de passe doivent être identiques.");
    await page.screenshot({ path: testInfo.outputPath("password-mismatch-mobile.png"), fullPage: true });
    expect(submitted).toBeUndefined();

    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill("nouveau-secret-de-test");
    await page.getByRole("button", { name: "Enregistrer mon nouveau mot de passe" }).click();
    await expect(page.getByRole("heading", { name: "Votre mot de passe a été modifié" })).toBeVisible();
    expect(submitted).toMatchObject({
      token_hash: "one-time-secret",
      password: "nouveau-secret-de-test",
      confirmPassword: "nouveau-secret-de-test",
    });
    await page.screenshot({ path: testInfo.outputPath("success-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("success-desktop.png"), fullPage: true });
  });

  test("une erreur de politique reste compréhensible puis un lien invalide propose une nouvelle demande", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/auth/recovery/complete", async (route) => {
      await route.fulfill({ status: 422, json: { error: "password_rejected", recoverySessionReady: true } });
    });
    await page.goto("/reinitialiser-mot-de-passe#token_hash=used-token&type=recovery");
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("mot-de-passe-faible");
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill("mot-de-passe-faible");
    await page.getByRole("button", { name: "Enregistrer mon nouveau mot de passe" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("exigences de sécurité");
    await page.screenshot({ path: test.info().outputPath("password-policy-error-mobile.png"), fullPage: true });

    await page.unroute("**/api/auth/recovery/complete");
    await page.route("**/api/auth/recovery/complete", (route) =>
      route.fulfill({ status: 400, json: { error: "invalid_link" } }),
    );
    await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("mot-de-passe-faible");
    await page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }).fill("mot-de-passe-faible");
    await page.getByRole("button", { name: "Enregistrer mon nouveau mot de passe" }).click();
    await expect(page.getByRole("heading", { name: "Ce lien n’est plus valide" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Demander un nouveau lien" })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("invalid-link-after-submit-mobile.png"), fullPage: true });
  });

  test("l’erreur réseau reste compréhensible et ne révèle pas le compte", async ({ page }, testInfo) => {
    await page.route("**/api/auth/recovery/request", (route) =>
      route.fulfill({ status: 503, json: { error: "temporarily_unavailable" } }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/mot-de-passe-oublie");
    await page.getByLabel("Adresse e-mail").fill("camille@example.com");
    await page.getByRole("button", { name: "Envoyer le lien de réinitialisation" }).click();
    await expect(page.locator('p[role="alert"]')).toHaveText(/Nous n’avons pas pu traiter la demande/);
    await page.screenshot({ path: testInfo.outputPath("request-network-error-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: testInfo.outputPath("request-network-error-desktop.png"), fullPage: true });
  });
});
