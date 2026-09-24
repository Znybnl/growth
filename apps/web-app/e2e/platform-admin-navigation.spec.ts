import { expect, test } from "@playwright/test";
import { getPlatformAdminNavigationItems } from "@/lib/platform-admin-navigation";
import { signIn } from "./auth-session";

const platformAdminRoutes = [
  "/admin",
  "/admin/prize-suggestions",
  "/backgrounds",
  "/affiliates",
  "/support",
];

test.describe("Navigation de l’administration plateforme", () => {
  test("le modèle ne fournit les entrées qu'aux administrateurs autorisés", () => {
    expect(getPlatformAdminNavigationItems(false)).toEqual([]);
    expect(getPlatformAdminNavigationItems(true).map(({ href, label }) => ({ href, label }))).toEqual([
      { href: "/admin", label: "Pilotage" },
      { href: "/admin/prize-suggestions", label: "Suggestions de lots" },
      { href: "/backgrounds", label: "Bibliothèque" },
      { href: "/affiliates", label: "Affiliation" },
      { href: "/support", label: "Supervision" },
    ]);
  });

  test("un marchand ne voit aucun lien admin sur desktop ni dans le drawer mobile", async ({ page }) => {
    if (!process.env.OKADO_E2E_EMAIL || !process.env.OKADO_E2E_PASSWORD) {
      test.skip(true, "Configurez le compte marchand E2E dédié pour tester la navigation authentifiée.");
      return;
    }

    await signIn(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    const sidebar = page.locator("#merchant-navigation");
    await expect(sidebar).toBeVisible();
    for (const route of platformAdminRoutes) {
      await expect(sidebar.locator(`a[href="${route}"]`)).toHaveCount(0);
    }
    await expect(sidebar.getByText("Administration plateforme", { exact: true })).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(sidebar).toBeVisible();
    for (const route of platformAdminRoutes) {
      await expect(sidebar.locator(`a[href="${route}"]`)).toHaveCount(0);
    }
    await expect(sidebar.getByText("Administration plateforme", { exact: true })).toHaveCount(0);
  });
});
