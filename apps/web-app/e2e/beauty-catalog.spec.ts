import { expect, test, type Page } from "@playwright/test";
import catalog from "../src/lib/beauty-catalog-466.fixture.json";
import { BEAUTY_SUBSECTOR_OPTIONS } from "../src/lib/merchant-options";
import { suggestionRequiresPurchase } from "../src/lib/prize-suggestion-fields";

async function isolate(page: Page) {
  const writes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      writes.push(request.url());
      return route.fulfill({ status: 403, json: { error: "Fixture: aucune écriture autorisée." } });
    }
    if (new URL(request.url()).pathname === "/api/prize-suggestions") {
      const category = new URL(request.url()).searchParams.get("subsector");
      const selected = BEAUTY_SUBSECTOR_OPTIONS.includes(category as typeof BEAUTY_SUBSECTOR_OPTIONS[number])
        ? category : BEAUTY_SUBSECTOR_OPTIONS[0];
      return route.fulfill({ json: { suggestions: catalog.filter(s => s.industrySubsector === selected).map(s => ({ ...s, isActive: true })) } });
    }
    return route.fulfill({ json: { items: [], assets: {} } });
  });
  return writes;
}

async function openSuggestions(page: Page, mode: string) {
  if (mode === "wizard") await page.getByRole("button", { name: /04.*Les lots/ }).click();
  await page.getByRole("button", { name: mode === "wizard" ? "Suggestions de lots" : "Suggérer des lots" }).click();
  return page.getByRole("dialog");
}

for (const mode of ["wizard", "classic"]) {
  for (const category of BEAUTY_SUBSECTOR_OPTIONS) {
    test(`${mode} : ${category}, ajout fidèle et lot existant préservé`, async ({ page }) => {
      const writes = await isolate(page);
      await page.goto("/dev/beauty-catalog-proof");
      await page.getByLabel("Activité de test").selectOption(category);
      await page.getByLabel("Interface", { exact: true }).selectOption(mode);
      const dialog = await openSuggestions(page, mode);
      const expected = catalog.filter(s => s.industrySubsector === category);
      await expect(dialog.getByRole("button", { name: "Ajouter", exact: true })).toHaveCount(expected.length);
      for (const suggestion of expected) await expect(dialog.getByText(suggestion.label, { exact: true })).toBeVisible();
      const added = expected.find(s => suggestionRequiresPurchase(s.description))!;
      const card = mode === "classic" ? dialog.locator("article").filter({ hasText: added.label })
        : dialog.locator("div.rounded-\\[12px\\]").filter({ has: page.getByText(added.label, { exact: true }) });
      await card.getByRole("button", { name: "Ajouter", exact: true }).click();
      if (await dialog.count()) await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
      await expect(page.locator('input[value="LOT EXISTANT À PRÉSERVER"]')).toHaveCount(1);
      await expect(page.locator(`input[value="${added.label}"]`)).toHaveCount(1);
      if (mode === "classic") {
        await page.getByRole("button", { name: "Conditions", exact: true }).last().click();
        await expect(page.getByLabel("Texte affiché au client")).toHaveValue(added.description);
      } else {
        await expect(page.getByLabel("Conditions d’utilisation (optionnel)").last()).toHaveValue(added.description);
        await expect(page.getByLabel("Conditions d’utilisation (optionnel)").first()).toHaveValue("Condition existante inchangée");
      }
      const required = page.getByRole("checkbox", { name: /Achat requis pour le retrait/ }).last();
      await expect(required).toBeChecked();
      await required.uncheck();
      await expect(required).not.toBeChecked();
      if (mode === "classic") {
        await page.getByRole("dialog").getByRole("button", { name: "Fermer", exact: true }).click();
        await page.getByRole("button", { name: "Conditions", exact: true }).first().click();
        await expect(page.getByLabel("Texte affiché au client")).toHaveValue("Condition existante inchangée");
        await expect(page.getByRole("checkbox", { name: /Achat requis pour le retrait/ })).not.toBeChecked();
      }
      expect(writes).toEqual([]);
    });
  }
}

for (const mode of ["wizard", "classic"]) {
  test(`${mode} : une réduction autonome ne coche pas l'achat requis`, async ({ page }) => {
    const writes = await isolate(page);
    await page.goto("/dev/beauty-catalog-proof");
    await page.getByLabel("Interface", { exact: true }).selectOption(mode);
    const dialog = await openSuggestions(page, mode);
    const card = mode === "classic" ? dialog.locator("article").filter({ hasText: "-10% PRESTATION" })
      : dialog.locator("div.rounded-\\[12px\\]").filter({ has: page.getByText("-10% PRESTATION", { exact: true }) });
    await card.getByRole("button", { name: "Ajouter", exact: true }).click();
    if (await dialog.count()) await dialog.getByRole("button", { name: "Fermer", exact: true }).click();
    if (mode === "classic") await page.getByRole("button", { name: "Conditions", exact: true }).last().click();
    await expect(page.getByRole("checkbox", { name: /Achat requis pour le retrait/ }).last()).not.toBeChecked();
    expect(writes).toEqual([]);
  });

  test(`${mode} : changement de contexte ignore une réponse périmée`, async ({ page }) => {
    await isolate(page);
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    let started!: () => void;
    const pending = new Promise<void>(resolve => { started = resolve; });
    await page.route("**/api/prize-suggestions?**", async (route) => {
      const category = new URL(route.request().url()).searchParams.get("subsector");
      if (category === "Coiffure") { started(); await barrier; }
      await route.fulfill({ json: { suggestions: catalog.filter(s => s.industrySubsector === category) } }).catch(() => {});
    });
    await page.goto("/dev/beauty-catalog-proof");
    await page.getByLabel("Interface", { exact: true }).selectOption(mode);
    await page.getByLabel("Activité de test").selectOption("Coiffure");
    await pending;
    await page.getByLabel("Activité de test").selectOption("Ongles");
    const dialog = await openSuggestions(page, mode);
    await expect(dialog.getByRole("button", { name: "Ajouter", exact: true })).toHaveCount(12);
    release();
    await expect(dialog.getByText("-10% ONGLES", { exact: true })).toBeVisible();
    await expect(dialog.getByText("BRUSHING OFFERT", { exact: true })).toHaveCount(0);
  });
}

test("profil : six choix, ancienne catégorie conservée uniquement pour un établissement qui l'utilise", async ({ page }) => {
  await isolate(page);
  await page.goto("/dev/beauty-catalog-proof");
  await page.getByLabel("Interface", { exact: true }).selectOption("profile");
  const select = page.getByRole("combobox", { name: "Sous-secteur", exact: true });
  await expect(select.locator("option")).toHaveCount(7); // placeholder + six
  for (const category of BEAUTY_SUBSECTOR_OPTIONS) await expect(select.locator("option", { hasText: category })).toHaveCount(1);
  await page.getByLabel("Activité de test").selectOption("Institut & soins");
  await expect(select).toHaveValue("Institut & soins");
  await expect(select.locator("option")).toHaveCount(8);
  await expect(select.locator("option", { hasText: "Ongles & cils" })).toHaveCount(0);
});

test("administration : six bibliothèques filtrables et conditions éditables sans écriture", async ({ page }) => {
  const writes = await isolate(page);
  await page.goto("/dev/beauty-catalog-proof");
  await page.getByLabel("Interface", { exact: true }).selectOption("admin");
  // The first selector filters the catalog; the second edits a suggestion.
  await page.getByRole("combobox", { name: "Secteur", exact: true }).first().selectOption("Beauté");
  const filter = page.getByRole("combobox", { name: "Filtrer par sous-secteur beauté" });
  await expect(filter.locator("option")).toHaveCount(8); // all + unclassified + six
  for (const category of BEAUTY_SUBSECTOR_OPTIONS) {
    await filter.selectOption(category);
    await expect(page.locator("article")).toHaveCount(catalog.filter(s => s.industrySubsector === category).length);
  }
  await page.getByRole("button", { name: "Modifier", exact: true }).first().click();
  await expect(page.getByRole("textbox", { name: "Condition suggérée", exact: true })).not.toBeEmpty();
  expect(writes).toEqual([]);
});

test("API réelle : catalogue non accessible sans session", async ({ request }) => {
  const response = await request.get("/api/prize-suggestions?industry=Beaut%C3%A9&subsector=Ongles");
  expect(response.status()).toBe(401);
});

for (const width of [1280, 390, 320]) {
  test(`wizard : catalogue lisible à ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await isolate(page);
    await page.goto("/dev/beauty-catalog-proof");
    await page.getByLabel("Activité de test").selectOption("Regard — cils & sourcils");
    const dialog = await openSuggestions(page, "wizard");
    await expect(dialog.getByRole("button", { name: "Ajouter", exact: true })).toHaveCount(11);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`catalog-${width}.png`) });
    expect(errors).toEqual([]);
  });
}
