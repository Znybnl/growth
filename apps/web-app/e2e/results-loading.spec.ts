import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test("@visual-1280 Résultats garde le filtre actif au changement de campagne", async ({ page, context, baseURL }) => {
  const email = process.env.OKADO_E2E_EMAIL;
  const password = process.env.OKADO_E2E_PASSWORD;
  test.skip(!email || !password, "Compte de recette requis");
  await page.setViewportSize({ width: 1280, height: 720 });
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\/[^/]*posthog\.com\//, route => route.abort());
  await page.goto("/connexion");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Mot de passe").fill(password!);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL(url => url.pathname === "/");

  await page.goto("/data?emailStatus=attention");
  const selector = page.getByRole("button", { name: /participations/ }).first();
  await expect(page.getByText("Coût / participation", { exact: true })).toBeVisible();
  await selector.click();
  const next = page.getByRole("option", { selected: false }).first();
  await expect(next).toBeVisible();
  await next.click();
  await expect(page).toHaveURL(url => Boolean(url.searchParams.get("campaign")) && url.searchParams.get("emailStatus") === "attention");
  await expect(page.getByText(/Cette vue affiche uniquement les e-mails en échec/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contacts, statuts et consentements" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await assertNoPageOverflow(page);
});
