import { expect, test } from "@playwright/test";
import { selectWizardStep as step } from "./helpers/wizard-step";
import { assertNoPageOverflow, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { suggestions: [], items: [], assets: {} } }));
});

function fixture(mode: string, template = "beauty-nude", secondary = "Une surprise pour votre prochaine visite") {
  const ink = template === "beauty-scratch-nude" ? "#49372c" : template === "scratch-lilac" ? "#210b32" : template === "beauty-nude" ? "#47382c" : template === "beauty-botanical" ? "#254238" : template === "classic" ? "#ffe85b" : template === "restaurant-pop" ? "#3c05a0" : "#ffffff";
  return `/dev/template-rendering-proof?${new URLSearchParams({ mode, template, secondary, ink })}`;
}

test("@visual-1280 : illustrations pleines, trois lignes et actions accessibles à faible hauteur", async ({ page }, info) => {
  for (const [width, height] of [[1280, 600], [1280, 720], [390, 844], [640, 360]]) {
    await page.setViewportSize({ width, height });
    await page.goto(fixture("wizard-responsive-edit"));
    const toolbar = page.getByTestId("wizard-save-toolbar");
    const appHeader = page.locator(".okado-workspace-shell > div > header").first();
    await expect(toolbar.getByRole("button", { name: "Prévisualiser" })).toBeVisible();
    await expect(toolbar.getByRole("button", { name: "Options du QR code" })).toBeVisible();
    await expect(toolbar.getByRole("link", { name: "Affiche" })).toBeVisible();
    await expect(toolbar.getByRole("link", { name: "Modifier l'e-mail de gain" })).toBeVisible();
    const headerRect = await appHeader.boundingBox();
    const toolbarRect = await toolbar.boundingBox();
    expect(headerRect).not.toBeNull();
    expect(toolbarRect).not.toBeNull();
    expect(Math.abs(toolbarRect!.y - (headerRect!.y + headerRect!.height))).toBeLessThanOrEqual(1);
    const livePreview = page.getByTestId("wizard-live-preview");
    if (await livePreview.count() && await page.locator(".okado-wizard").getAttribute("data-inline-preview") === "true") {
      const previewRect = await livePreview.boundingBox();
      expect(previewRect).not.toBeNull();
      expect(previewRect!.y).toBeGreaterThanOrEqual(toolbarRect!.y + toolbarRect!.height);
    }
    for (const art of await page.getByTestId("game-type-illustration").all()) {
      const ratio = await art.evaluate(node => { const svg = node.querySelector("svg")!; return { parent: node.getBoundingClientRect().width / node.getBoundingClientRect().height, svg: svg.getBoundingClientRect().width / svg.getBoundingClientRect().height }; });
      expect(ratio.parent).toBeCloseTo(340 / 180, 1);
      expect(ratio.svg).toBeCloseTo(ratio.parent, 1);
    }
    await page.screenshot({ path: info.outputPath(`jeu-${width}x${height}.png`) });
    await step(page, 1);
    const promise = page.locator('textarea').first();
    const subtitle = page.getByPlaceholder("Ex. Tentez votre chance !");
    await expect(promise).toHaveAttribute("rows", "3");
    await expect(subtitle).toHaveAttribute("rows", "3");
    await promise.fill("Premier texte\nDeuxième ligne\nTroisième ligne");
    await subtitle.fill("Un sous-titre\nDeuxième ligne\nTroisième ligne");
    await expect(page.getByText(/5 lignes/)).toHaveCount(0);
    await subtitle.scrollIntoViewIfNeeded();
    const pinnedToolbarRect = await toolbar.boundingBox();
    expect(pinnedToolbarRect).not.toBeNull();
    if (await livePreview.count() && await page.locator(".okado-wizard").getAttribute("data-inline-preview") === "true") {
      const pinnedPreviewRect = await livePreview.boundingBox();
      expect(pinnedPreviewRect).not.toBeNull();
      expect(pinnedPreviewRect!.y).toBeGreaterThanOrEqual(pinnedToolbarRect!.y + pinnedToolbarRect!.height);
    }
    await expect(toolbar.getByRole("link", { name: "Retour aux jeux" })).toBeInViewport();
    await expect(toolbar.getByRole("button", { name: "Enregistrer le brouillon", exact: true })).toBeInViewport();
    await expect(toolbar.getByRole("button", { name: "Publier", exact: true })).toBeInViewport();
    await expect(subtitle).toHaveValue("Un sous-titre\nDeuxième ligne\nTroisième ligne");
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`promesse-actions-${width}x${height}.png`) });
  }
});

test("@visual-1280 : cartes Beauté et autres homogènes, sélection conservée", async ({ page }, info) => {
  for (const width of [1280, 1920, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(fixture("wizard-responsive-edit"));
    await step(page, 2);
    await expect(page.getByText("Collection Beauté", { exact: true })).toHaveCount(0);
    const beautyTitle = page.getByRole("heading", { name: "Templates Beauté", exact: true });
    const otherTitle = page.getByRole("heading", { name: "Autres templates de roue", exact: true });
    expect(await beautyTitle.evaluate(e => getComputedStyle(e).fontSize)).toBe(await otherTitle.evaluate(e => getComputedStyle(e).fontSize));
    const cards = page.getByTestId("game-template-card");
    expect(await cards.count()).toBe(15);
    for (const art of await page.getByTestId("game-template-art").all()) expect((await art.boundingBox())!.height).toBe(160);
    const modern = cards.filter({ has: page.getByText("Moderne", { exact: true }) });
    await modern.click();
    await expect(modern).toHaveAttribute("aria-pressed", "true");
    await expect(cards.filter({ hasText: "Nude & Or" })).toHaveAttribute("aria-pressed", "false");
    await assertNoPageOverflow(page);
    await beautyTitle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`templates-beaute-${width}.png`) });
    await otherTitle.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`templates-autres-${width}.png`) });
    if (width === 1920) expect((await page.locator('.wizard-progress').boundingBox())!.width).toBeGreaterThanOrEqual(250);
  }
});

test("@visual-1280 : aperçu et typographie identiques à la prévisualisation mobile, sans écriture", async ({ page, context }, info) => {
  test.setTimeout(90_000);
  const writes: string[] = [];
  page.on("request", r => { if (r.url().includes("/api/") && r.method() !== "GET") writes.push(r.url()); });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const actual = await context.newPage();
  await actual.setViewportSize({ width: 390, height: 740 });
  await actual.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] } } }));
  for (const template of ["beauty-nude", "beauty-botanical", "classic", "restaurant-pop", "cocorico-wheel"]) {
    await page.goto(fixture("wizard-responsive-edit", template));
    await expect(page.getByRole("button", { name: "Agrandir", exact: true })).toHaveCount(0);
    await expect(page.getByText("Aperçu en direct", { exact: true })).toHaveCount(0);
    const live = page.frameLocator('iframe[title^="Aperçu du brouillon"]');
    await expect(live.locator(".okado-wheel-subtitle")).toBeVisible();
    await actual.goto(fixture("game-preview", template));
    await expect(actual.locator(".okado-wheel-subtitle")).toBeVisible();
    const frame = page.frames().find(f => f.url() === "about:srcdoc")!;
    expect(await frame.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 390, height: 740 });
    const phone = (await page.getByTestId("wizard-phone-preview").boundingBox())!;
    expect(phone.width).toBeLessThanOrEqual(261);
    expect(phone.height).toBeLessThan(481);
    const subtitleSize = await live.locator(".okado-wheel-subtitle").evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    const previousSize = template === "beauty-nude" ? 14.08 : template === "beauty-botanical" ? 14.4 : 14;
    expect(subtitleSize).toBeCloseTo(previousSize + 2, 1);
    for (const selector of [".okado-wheel-subtitle", ".okado-beauty-heading, .okado-cocorico-promo-text", ".font-display"]) {
      const dimensions = (node: Element) => { const style = getComputedStyle(node); const bounds = node.getBoundingClientRect(); return { fontSize: style.fontSize, family: style.fontFamily, lineHeight: style.lineHeight, width: bounds.width, height: bounds.height }; };
      const fromDraft = await live.locator(selector).first().evaluate(dimensions);
      const fromPreview = await actual.locator(selector).first().evaluate(dimensions);
      expect(fromDraft.fontSize).toBe(fromPreview.fontSize);
      expect(fromDraft.family).toBe(fromPreview.family);
      expect(fromDraft.lineHeight).toBe(fromPreview.lineHeight);
      expect(fromDraft.width).toBeCloseTo(fromPreview.width, 0);
      expect(fromDraft.height).toBeCloseTo(fromPreview.height, 0);
    }
    await page.screenshot({ path: info.outputPath(`live-${template}.png`) });
    await actual.screenshot({ path: info.outputPath(`preview-${template}.png`) });
  }
  expect(writes).toEqual([]);
  await actual.close();
});

test("@visual-1280 : tickets cohérents et typographie du brouillon à la résolution mobile", async ({ page, context }, info) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const actual = await context.newPage();
  await actual.setViewportSize({ width: 390, height: 740 });
  await actual.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] } } }));
  for (const template of ["beauty-scratch-nude", "scratch-lilac"]) {
    await page.goto(fixture("wizard-responsive-edit", template));
    const live = page.frameLocator('iframe[title^="Aperçu du brouillon"]');
    await expect(live.locator("h2")).toBeVisible();
    await actual.goto(fixture("game-preview", template));
    const typography = (node: Element) => { const s = getComputedStyle(node); return { size: s.fontSize, line: s.lineHeight, width: node.getBoundingClientRect().width }; };
    expect(await live.locator("h2").evaluate(typography)).toEqual(await actual.locator("h2").first().evaluate(typography));
    await page.screenshot({ path: info.outputPath(`live-${template}.png`) });
    await step(page, 2);
    for (const art of await page.getByTestId("game-template-art").all()) expect((await art.boundingBox())!.height).toBe(160);
    await page.getByTestId("classic-template-options").getByRole("button", { name: /Cadeau lilas/ }).click();
    await expect(page.getByTestId("classic-template-options").getByRole("button", { name: /Cadeau lilas/ })).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: info.outputPath(`galerie-${template}.png`) });
  }
  await actual.close();
});

test("les actions visibles transmettent les saisies au bon endpoint marchand ou administrateur", async ({ page }) => {
  for (const [mode, width] of [["edit", 1280], ["admin", 390]] as const) {
    await page.setViewportSize({ width, height: 600 });
    const endpoint = mode === "admin" ? "/api/admin/merchants/fixture-account/locations/template-proof-merchant/campaigns/setup" : "/api/campaigns/setup";
    let body: Record<string, unknown> | undefined;
    await page.route(`**${endpoint}`, route => { body = route.request().postDataJSON(); return route.fulfill({ status: 500, json: { error: "Erreur synthétique de sauvegarde" } }); });
    await page.goto(fixture(`wizard-responsive-${mode}`));
    await step(page, 1);
    await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Saisie à conserver");
    await page.getByPlaceholder("Ex. Tentez votre chance !").fill("Trois lignes\npour le\nsous-titre");
    await page.getByTestId("wizard-save-toolbar").getByRole("button", { name: "Enregistrer le brouillon", exact: true }).click();
    await expect.poll(() => body?.title).toBe("Saisie à conserver");
    expect(body?.isActive).toBe(false);
    await expect(page.getByText("La campagne n’a pas pu être enregistrée. Vérifiez les informations puis réessayez.").first()).toBeVisible();
    await expect(page.getByText("Jeu prêt", { exact: true })).toHaveCount(0);
    await page.unroute(`**${endpoint}`);
  }
});

test("@visual-1280 : miniatures fidèles Éclat et Moderne, accroches courtes et sous-titres longs", async ({ page }, info) => {
  for (const width of [1280, 1920, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(fixture("wizard-responsive-edit-retail"));
    await step(page, 2);
    const eclat = page.getByTestId("wheel-template-thumbnail-rose-institut");
    await expect(eclat).toHaveCSS("background-color", "rgb(255, 244, 247)");
    const wheel = eclat.locator(".rounded-full.border-\\[5px\\]");
    await expect(wheel).toHaveCSS("background-image", /rgb\(243, 164, 196\)/);
    await expect(wheel).toHaveCSS("background-image", /rgb\(255, 249, 251\)/);
    const modern = page.getByTestId("wheel-template-thumbnail-cocorico-wheel");
    await expect(modern).toHaveCSS("background-color", "rgb(37, 99, 235)");
    await expect(modern.getByTestId("modern-thumbnail-wheel").locator(".lucide-gift")).toHaveCount(8);
    await expect(modern.getByTestId("modern-thumbnail-wheel").locator(".lucide-pointer")).toHaveCount(1);
    for (const thumbnail of [eclat, modern]) {
      await expect(thumbnail.getByTestId("template-sample-heading")).toHaveCSS("font-size", "18px");
      expect((await thumbnail.getByTestId("template-sample-heading").innerText()).length).toBeLessThan(20);
      expect((await thumbnail.getByTestId("template-sample-subtitle").innerText()).length).toBeGreaterThan(55);
      const copy = (await thumbnail.getByTestId("template-sample-subtitle").boundingBox())!;
      const wheelBox = (await (thumbnail === modern ? modern.getByTestId("modern-thumbnail-wheel") : wheel).boundingBox())!;
      expect(copy.x + copy.width).toBeLessThanOrEqual(wheelBox.x);
    }
    await modern.scrollIntoViewIfNeeded();
    await assertNoPageOverflow(page);
    await page.screenshot({ path: info.outputPath(`miniatures-retours-${width}.png`) });
  }
});
