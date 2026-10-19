import { expect, test } from "@playwright/test";

import {
  isAdminCampaignLocationAllowed,
} from "@/lib/admin-campaign-access";
import { isSaasAdminEmail } from "@/lib/admin";

test.describe("Création et modification des jeux par l’administration plateforme", () => {
  test("limite la sélection aux établissements associés au compte choisi", () => {
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-primary", ["merchant-site-2"])).toBe(true);
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-site-2", ["merchant-site-2"])).toBe(true);
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-other", ["merchant-site-2"])).toBe(false);
  });

  test("l’assistance globale reste réservée aux administrateurs plateforme", () => {
    expect(isSaasAdminEmail("pierreh.brunelle@gmail.com")).toBe(true);
    expect(isSaasAdminEmail("merchant@example.test")).toBe(false);
    expect(isSaasAdminEmail(null)).toBe(false);
  });

  test("un visiteur non authentifié ne peut pas appeler la création dédiée", async ({ page }) => {
    await page.goto("/connexion");
    const status = await page.evaluate(async () => {
      const response = await fetch(
        "/api/admin/merchants/merchant-primary/locations/merchant-primary/campaigns/setup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantId: "merchant-primary" }),
        },
      );
      return response.status;
    });
    expect(status).toBe(401);
  });

  test("un visiteur non authentifié ne peut pas ouvrir la liste admin des jeux", async ({ page }) => {
    await page.goto("/admin/campaigns");
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("un visiteur ne peut pas consulter les destinataires ni dupliquer vers un marchand", async ({ page }) => {
    await page.goto("/connexion");
    const statuses = await page.evaluate(async () => {
      const url = "/api/admin/campaigns/campaign-test/duplicate-merchant";
      const responses = await Promise.all([fetch(url), fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountMerchantId: "merchant-primary", locationIds: ["merchant-primary"], adaptMerchantIdentity: true }),
      })]);
      return responses.map(({ status }) => status);
    });
    expect(statuses).toEqual([401, 401]);
  });

  test("un visiteur non authentifié ne peut pas générer de prévisualisation admin ni de QR", async ({ page }) => {
    await page.goto("/connexion");
    const statuses = await page.evaluate(async () => {
      const responses = await Promise.all([
        fetch("/api/admin/campaigns/campaign-test/preview"),
        fetch("/api/admin/campaigns/campaign-test/preview?format=qr"),
        fetch("/api/admin/campaigns/campaign-test/qr"),
      ]);
      return responses.map(({ status }) => status);
    });
    expect(statuses).toEqual([401, 401, 401]);
  });

  test("un visiteur non authentifié ne peut pas enregistrer une affiche via la route admin", async ({ page }) => {
    await page.goto("/connexion");
    const status = await page.evaluate(async () => {
      const response = await fetch("/api/admin/campaigns/campaign-test/poster-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poster: {} }),
      });
      return response.status;
    });
    expect(status).toBe(401);
  });

  test("un visiteur non authentifié ne peut pas charger les médias d’un jeu admin", async ({ page }) => {
    await page.goto("/connexion");
    const status = await page.evaluate(async () => {
      const response = await fetch("/api/admin/campaigns/campaign-test/assets");
      return response.status;
    });
    expect(status).toBe(401);
  });

  test("un marchand authentifié est refusé sans toucher à un jeu", async ({ page }) => {
    if (!process.env.OKADO_E2E_EMAIL || !process.env.OKADO_E2E_PASSWORD) {
      test.skip(true, "Configurez le compte marchand E2E dédié pour contrôler le refus serveur.");
      return;
    }

    // Test the server permission boundary without depending on dashboard loading
    // or the post-login client navigation of an unrelated page.
    await page.goto("/connexion");
    const login = await page.request.post("/api/auth/signin", {
      headers: { Origin: new URL(page.url()).origin },
      data: { email: process.env.OKADO_E2E_EMAIL, password: process.env.OKADO_E2E_PASSWORD },
    });
    expect(login.ok()).toBe(true);
    const statuses = await page.evaluate(async () => {
      const requests = await Promise.all([
        fetch(
          "/api/admin/merchants/merchant-primary/locations/merchant-primary/campaigns/setup",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ merchantId: "merchant-primary" }),
          },
        ),
        fetch("/api/admin/campaigns/campaign-test/poster-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poster: {} }),
        }),
        fetch("/api/admin/campaigns/campaign-test/assets"),
        fetch("/api/admin/campaigns/campaign-test/preview"),
        fetch("/api/admin/campaigns/campaign-test/preview?format=qr"),
        fetch("/api/admin/campaigns/campaign-test/qr"),
        fetch("/api/admin/campaigns/campaign-test/poster-logo?url=image"),
        fetch("/api/admin/campaigns/campaign-test/duplicate-merchant"),
        fetch("/api/admin/campaigns/campaign-test/duplicate-merchant", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountMerchantId: "merchant-primary", locationIds: ["merchant-primary"], adaptMerchantIdentity: true }),
        }),
      ]);
      return requests.map(({ status }) => status);
    });
    expect(statuses).toEqual([403, 403, 403, 403, 403, 403, 403, 403, 403]);
  });
});
