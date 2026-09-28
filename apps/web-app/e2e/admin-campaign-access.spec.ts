import { expect, test } from "@playwright/test";

import {
  isAdminCampaignLocationAllowed,
  isAdminCreatedCampaignAccessible,
} from "@/lib/admin-campaign-access";
import { signIn } from "./auth-session";

test.describe("Création d’un jeu par l’administration plateforme", () => {
  test("limite la sélection aux établissements associés au compte choisi", () => {
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-primary", ["merchant-site-2"])).toBe(true);
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-site-2", ["merchant-site-2"])).toBe(true);
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-other", ["merchant-site-2"])).toBe(false);
  });

  test("un administrateur ne retrouve que ses jeux rattachés au bon établissement", () => {
    const audit = {
      adminUserId: "admin-1",
      accountMerchantId: "merchant-primary",
      targetLocationId: "merchant-site-2",
    };

    expect(isAdminCreatedCampaignAccessible("merchant-site-2", "admin-1", audit)).toBe(true);
    expect(isAdminCreatedCampaignAccessible("merchant-site-2", "admin-2", audit)).toBe(false);
    expect(isAdminCreatedCampaignAccessible("merchant-primary", "admin-1", audit)).toBe(false);
    expect(isAdminCreatedCampaignAccessible("merchant-site-2", "admin-1", null)).toBe(false);
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

  test("un visiteur non authentifié ne peut pas ouvrir la liste admin des jeux créés", async ({ page }) => {
    await page.goto("/admin/campaigns");
    await expect(page).toHaveURL(/\/connexion/);
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

    await signIn(page);
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
      ]);
      return requests.map(({ status }) => status);
    });
    expect(statuses).toEqual([403, 403]);
  });
});
