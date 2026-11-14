import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TRAVEL_WHEEL_THEMES } from "../src/lib/travel-wheel-themes";
import { TRAVEL_SCRATCH_THEMES } from "../src/lib/travel-scratch-themes";
import { rejectAnalyticsForVisualTests, captureVisualAt1280 } from "./helpers/visual-1280";
import { selectWizardStep } from "./helpers/wizard-step";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {}, emailCount: 0 } }));
});

test("fonds Voyage présents dans le package Vercel", async ({ request }) => {
  expect(readFileSync(resolve(__dirname, "../../../.vercelignore"), "utf8")).toContain("!apps/web-app/public/images/templates/travel/*.webp");
  for (const theme of TRAVEL_WHEEL_THEMES) {
    const response = await request.get(theme.artwork);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/webp");
  }
});

for (const theme of TRAVEL_WHEEL_THEMES) {
  test(`${theme.name} : fond et proportions en mobile`, async ({ page }, info) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/dev/christmas-wheels?template=${theme.id}&mode=public`);
      const scene = page.getByTestId("christmas-wheel-scene");
      const artwork = page.locator(`img[data-template-art="${theme.id}"]`);
      await expect(artwork).toHaveJSProperty("complete", true);
      expect(await artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(scene.locator("header")).toHaveCSS("border-top-width", "0px");
      if (theme.id === "travel-tropical") {
        await expect(scene.locator("h1")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
        await expect(scene.locator("h1")).toHaveCSS("color", `rgb(${parseInt(theme.logo.slice(1, 3), 16)}, ${parseInt(theme.logo.slice(3, 5), 16)}, ${parseInt(theme.logo.slice(5, 7), 16)})`);
        const subtitle = scene.locator("p[data-testid='christmas-wheel-subtitle']");
        await expect(subtitle).toHaveCSS("text-shadow", "none");
        expect(await subtitle.evaluate(element => getComputedStyle(element, "::before").backgroundImage)).toContain("radial-gradient");
        expect(await subtitle.evaluate(element => getComputedStyle(element, "::before").backgroundImage)).toContain("0.56");
        expect(await subtitle.evaluate(element => getComputedStyle(element, "::before").backgroundImage)).toContain("226, 248, 255");
        const blueSegmentLabels = scene.locator("[data-testid='christmas-wheel'] svg text");
        await expect(blueSegmentLabels.nth(1)).toHaveAttribute("fill", "#ffffff");
      }
      if (theme.id === "travel-roadtrip") {
        await expect(scene.locator("h1")).toHaveCSS("isolation", "isolate");
        await expect(scene.locator("h1")).toHaveCSS("color", "rgb(166, 55, 24)");
        await expect(scene.locator("h1")).toHaveCSS("padding-top", /\d/);
        expect(await scene.locator("h1").evaluate(element => getComputedStyle(element, "::before").backgroundColor)).toBe("rgb(255, 241, 216)");
        expect(await scene.locator("h1").evaluate(element => getComputedStyle(element, "::before").clipPath)).toContain("polygon");
        expect(await scene.locator("h1").evaluate(element => getComputedStyle(element, "::before").inset)).toContain("-");
        const titleBounds = await scene.locator("h1").boundingBox();
        const sceneBounds = await scene.boundingBox();
        expect(titleBounds!.x).toBeGreaterThanOrEqual(sceneBounds!.x);
        expect(titleBounds!.x + titleBounds!.width).toBeLessThanOrEqual(sceneBounds!.x + sceneBounds!.width);
        const subtitle = scene.locator("p[data-testid='christmas-wheel-subtitle']");
        await expect(subtitle).toHaveCSS("text-shadow", "none");
        expect(await subtitle.evaluate(element => getComputedStyle(element, "::before").backgroundImage)).toContain("radial-gradient");
      }
      const wheel = await scene.getByTestId("christmas-wheel").boundingBox();
      const button = await scene.getByTestId("travel-wheel-cta").boundingBox();
      const center = await scene.getByTestId("travel-wheel-center").boundingBox();
      expect(wheel).not.toBeNull(); expect(button).not.toBeNull(); expect(center).not.toBeNull();
      expect(button!.width / wheel!.width).toBeLessThan(0.72);
      expect(button!.height / wheel!.width).toBeGreaterThan(0.14);
      expect(center!.width / wheel!.width).toBeLessThan(0.25);
      await expect(scene.getByTestId("christmas-wheel-pointer").locator("circle")).toHaveCount(1);
      await page.screenshot({ path: info.outputPath(`${theme.id}-${width}.png`), fullPage: true, animations: "disabled" });
    }
  });

  test(`${theme.name} : le bouton central déclenche l’action Jouer`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dev/christmas-wheels?template=${theme.id}&mode=interaction`);
    const scene = page.getByTestId("christmas-wheel");
    const center = scene.getByTestId("travel-wheel-center");
    await expect(center).toBeEnabled();
    await center.click();
    await expect(page.getByTestId("action-count")).toHaveText("1");
  });
}

test("@visual-1280 section Voyage dédiée dans les deux éditeurs", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=classic&business=travel`);
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const section = page.getByTestId("travel-template-options");
    await expect(page.getByRole("heading", { name: "Templates Voyage" })).toBeVisible();
    await expect(section).not.toContainText("Noël");
    for (const theme of TRAVEL_WHEEL_THEMES) {
      const card = section.getByRole("button", { name: new RegExp(theme.name) });
      await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("classic-template-options").getByRole("button", { name: new RegExp(theme.name) })).toHaveCount(0);
      if (mode.startsWith("wizard")) {
        await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
        const preview = page.getByRole("dialog", { name: "Aperçu du jeu" }).frameLocator("iframe");
        const artwork = preview.locator(`img[data-template-art="${theme.id}"]`);
        await expect(artwork).toHaveJSProperty("complete", true);
        expect(await artwork.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
        await page.keyboard.press("Escape");
      }
    }
    await captureVisualAt1280(page, info, `voyage-${mode}`);
  }
});

test("@visual-1280 section Voyage dédiée aux tickets dans les deux éditeurs", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const mode of ["wizard-responsive-edit", "editor-prize-budget"]) {
    await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=travel-scratch-elegant&business=travel`);
    if (mode.startsWith("wizard")) await selectWizardStep(page, 2);
    const section = page.getByTestId("travel-scratch-template-options");
    await expect(page.getByRole("heading", { name: "Templates Voyage" })).toBeVisible();
    await expect(section.getByRole("button")).toHaveCount(3);
    for (const theme of TRAVEL_SCRATCH_THEMES) {
      const card = section.getByRole("button", { name: new RegExp(theme.name) });
      await card.click();
      await expect(card).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("classic-template-options").getByRole("button", { name: new RegExp(theme.name) })).toHaveCount(0);
      if (mode.startsWith("wizard")) {
        await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
        const preview = page.getByRole("dialog", { name: "Aperçu du jeu" });
        await expect(preview).toBeVisible();
        await page.screenshot({ path: info.outputPath(`ticket-voyage-preview-${theme.id}.png`), animations: "disabled" });
        await page.keyboard.press("Escape");
      }
    }
    await captureVisualAt1280(page, info, `ticket-voyage-${mode}`);
  }
});

test("Voyage : le ticket élégant est sélectionné par défaut pour une nouvelle campagne", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-create&business=travel");
  await page.getByTestId("wizard-game-choices").getByRole("button", { name: /Ticket à gratter/ }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Voyage de découverte");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByTestId("travel-scratch-template-options").getByRole("button", { name: /Voyage élégant/ })).toHaveAttribute("aria-pressed", "true");
});

for (const game of ["wheel", "scratch"] as const) {
  test(`Tropical ${game} : la couleur du titre est initialisée et personnalisable`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const initial = game === "wheel" ? "classic" : "travel-scratch-elegant";
    await page.goto(`/dev/template-rendering-proof?mode=wizard-responsive-edit&template=${initial}&business=travel`);
    await selectWizardStep(page, 2);
    const gallery = page.getByTestId(game === "wheel" ? "travel-template-options" : "travel-scratch-template-options");
    await gallery.getByRole("button", { name: /Vacances tropicales/ }).click();
    const advanced = page.getByText("Paramètres avancés", { exact: false }).first();
    await advanced.click();
    const input = page.getByLabel("Couleur du texte principal");
    await expect(input).toHaveValue("#065360");
    const title = page.getByTestId("wizard-phone-preview").frameLocator("iframe").locator(game === "wheel" ? "h1" : "h2").first();
    await expect(title).toHaveCSS("color", "rgb(6, 83, 96)");
    await input.fill("#b45283");
    await expect(title).toHaveCSS("color", "rgb(180, 82, 131)");
  });
}

test("Tropical : la couleur personnalisée est conservée en aperçu et sur la page de jeu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const template of ["travel-tropical", "travel-scratch-tropical"]) {
    for (const mode of ["preview", "public", "game-preview"]) {
      await page.goto(`/dev/template-rendering-proof?mode=${mode}&template=${template}&business=travel&ink=%23b45283`);
      const title = page.locator(template.includes("scratch") ? "h2" : "h1").filter({ hasText: "Une surprise" }).first();
      await expect(title).toHaveCSS("color", "rgb(180, 82, 131)");
    }
  }
});
