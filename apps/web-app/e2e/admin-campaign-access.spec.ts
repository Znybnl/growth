import { expect, test } from "@playwright/test";

import { isAdminCampaignLocationAllowed } from "@/lib/admin-campaign-access";
import { signIn } from "./auth-session";

test.describe("Création d’un jeu par l’administration plateforme", () => {
  test("limite la sélection aux établissements associés au compte choisi", () => {
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-primary", ["merchant-site-2"])).toBe(true);
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-site-2", ["merchant-site-2"])).toBe(true);
    expect(isAdminCampaignLocationAllowed("merchant-primary", "merchant-other", ["merchant-site-2"])).toBe(false);
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

  test("un marchand authentifié est refusé sans toucher à un jeu", async ({ page }) => {
    if (!process.env.OKADO_E2E_EMAIL || !process.env.OKADO_E2E_PASSWORD) {
      test.skip(true, "Configurez le compte marchand E2E dédié pour contrôler le refus serveur.");
      return;
    }

    await signIn(page);
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
    expect(status).toBe(403);
  });
});
