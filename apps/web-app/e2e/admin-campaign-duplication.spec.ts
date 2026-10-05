import { expect, test } from "@playwright/test";

const endpoint = "**/api/admin/campaigns/admin-copy-fixture/duplicate-merchant*";
const account = { id: "target-account", companyName: "Commerce pilote", city: "Lyon" };
const locations = [{ id: "site-a", companyName: "Commerce Centre", city: "Lyon" }, { id: "site-b", companyName: "Commerce Nord", city: "Lyon" }];

for (const width of [320, 390, 1280]) {
  test(`duplication admin complète sans écriture réelle à ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    const errors: string[] = [];
    const bodies: unknown[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(endpoint, async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        bodies.push(request.postDataJSON());
        await route.fulfill({ status: 201, json: { created: [{ id: "copy-a", locationId: "site-a", companyName: "Commerce Centre" }] } });
      } else {
        const params = new URL(request.url()).searchParams;
        await route.fulfill({ json: params.has("merchantId") ? { locations } : { accounts: [account], hasNextPage: false } });
      }
    });
    await page.goto("/dev/admin-duplication-proof");
    await page.getByRole("region", { name: "Administrateur", exact: true }).getByRole("button", { name: "Ouvrir les actions" }).click();
    await page.getByRole("menuitem", { name: "Dupliquer vers un marchand", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Commerce pilote/ }).click();
    await expect(dialog.getByRole("checkbox", { name: /Utiliser le logo/ })).toBeChecked();
    await dialog.getByRole("checkbox", { name: /Commerce Centre/ }).check();
    const rect = await dialog.boundingBox();
    expect(rect?.x).toBeGreaterThanOrEqual(0);
    expect((rect?.x ?? 0) + (rect?.width ?? 0)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: testInfo.outputPath(`admin-copy-${width}.png`), fullPage: true });
    await dialog.getByRole("button", { name: "Créer les brouillons" }).click();
    await expect(dialog.getByText("1 brouillon(s) créé(s)")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Modifier le jeu · Commerce Centre" })).toHaveAttribute("href", "/admin/campaigns/copy-a/edit");
    await expect(dialog.getByRole("checkbox", { name: /Commerce Centre/ })).toBeDisabled();
    expect(bodies).toEqual([{ accountMerchantId: "target-account", locationIds: ["site-a"], adaptMerchantIdentity: true }]);
    expect(errors).toEqual([]);
    await dialog.getByRole("button", { name: "Fermer", exact: true }).last().click();
    await expect(dialog).not.toBeVisible();
  });
}

test("l’action inter-comptes n’apparaît pas pour un marchand", async ({ page }) => {
  await page.goto("/dev/admin-duplication-proof");
  await page.getByRole("region", { name: "Marchand", exact: true }).getByRole("button", { name: "Ouvrir les actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Dupliquer vers des sites", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Dupliquer vers un marchand", exact: true })).toHaveCount(0);
});

test("erreur partielle : les copies réussies restent accessibles et ne sont pas recréées", async ({ page }) => {
  let writes = 0;
  await page.route(endpoint, async (route) => {
    if (route.request().method() === "POST") {
      writes++;
      await route.fulfill({ status: 500, json: { created: [{ id: "partial-a", locationId: "site-a", companyName: "Commerce Centre" }], error: "Copie interrompue. Le premier brouillon est créé." } });
    } else await route.fulfill({ json: new URL(route.request().url()).searchParams.has("merchantId") ? { locations } : { accounts: [account] } });
  });
  await page.goto("/dev/admin-duplication-proof");
  await page.getByRole("region", { name: "Administrateur", exact: true }).getByRole("button", { name: "Ouvrir les actions" }).click();
  await page.getByRole("menuitem", { name: "Dupliquer vers un marchand", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Commerce pilote/ }).click();
  await dialog.getByRole("checkbox", { name: /Commerce Centre/ }).check();
  await dialog.getByRole("checkbox", { name: /Commerce Nord/ }).check();
  await dialog.getByRole("checkbox", { name: /Utiliser le logo/ }).uncheck();
  await dialog.getByRole("button", { name: "Créer les brouillons" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Copie interrompue");
  await expect(dialog.getByRole("link", { name: /Commerce Centre/ })).toHaveAttribute("href", "/admin/campaigns/partial-a/edit");
  await expect(dialog.getByRole("checkbox", { name: /Commerce Centre/ })).toBeDisabled();
  await expect(dialog.getByRole("checkbox", { name: /Commerce Nord/ })).toBeChecked();
  expect(writes).toBe(1);
});

test("recherche paginée, aucun compte et erreur de chargement sans bouton actif", async ({ page }) => {
  const queries: string[] = [];
  await page.route(endpoint, async (route) => {
    const params = new URL(route.request().url()).searchParams;
    queries.push(params.toString());
    if (params.get("q") === "erreur") await route.fulfill({ status: 500, json: { error: "Chargement impossible" } });
    else await route.fulfill({ json: params.get("q") ? { accounts: [] } : { accounts: [account], hasNextPage: params.get("page") === "1" } });
  });
  await page.goto("/dev/admin-duplication-proof");
  await page.getByRole("region", { name: "Administrateur", exact: true }).getByRole("button", { name: "Ouvrir les actions" }).click();
  await page.getByRole("menuitem", { name: "Dupliquer vers un marchand", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(dialog.getByText("Page 2")).toBeVisible();
  await expect.poll(() => queries.some((query) => query.includes("page=2"))).toBe(true);
  await expect(dialog.getByRole("button", { name: /Commerce pilote/ })).toBeVisible();
  await dialog.getByRole("searchbox").fill("absent");
  await expect(dialog.getByText("Aucun compte ne correspond à cette recherche.")).toBeVisible();
  await expect(dialog.getByText("Page 1")).toBeVisible();
  await dialog.getByRole("searchbox").fill("erreur");
  await expect(dialog.getByRole("alert")).toContainText("Chargement impossible");
  await expect(dialog.getByRole("button", { name: "Créer les brouillons" })).toBeDisabled();
  expect(queries.some((query) => query.includes("page=2"))).toBe(true);
});
