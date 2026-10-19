import { expect, test, type Page } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
import { BEAUTY_WHEEL_THEMES, beautyWheelFontOptions } from "../src/lib/beauty-wheel-themes";
import { BEAUTY_SCRATCH_TEMPLATES } from "../src/lib/beauty-scratch-templates";
import { parseCampaignSetupInput } from "../src/lib/merchant-input";
import type { CampaignSetupInput } from "../src/lib/types";
import { ANALYTICS_CONSENT_COOKIE, ANALYTICS_CONSENT_VERSION } from "../src/lib/analytics-consent";

const fonts = ["playfair", "cormorant", "bodoni"] as const;
const fontNames = ["Playfair Display", "Cormorant Garamond", "Bodoni Moda"];
const templates = [...BEAUTY_WHEEL_THEMES, { id: "rose-institut" as const }, ...BEAUTY_SCRATCH_TEMPLATES];
test.use({ actionTimeout: 15000 });
const fixture = (mode: string, template = "beauty-botanical", font?: string) =>
  `/dev/template-rendering-proof?${new URLSearchParams({ mode, template,
    ...(template === "beauty-botanical" ? { ink: "#254238", background: "#f6f7f1" } : {}),
    ...(font ? { font } : {}) })}`;

test.beforeEach(async ({ context, baseURL, page }) => {
  await context.addCookies([{ name: ANALYTICS_CONSENT_COOKIE, url: baseURL!,
    value: encodeURIComponent(JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, choice: "rejected", decidedAt: Date.now() })) }]);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {} } }));
  await page.route("**/api/campaigns/setup", route => route.fulfill({ json: { campaign: { id: "template-proof-campaign" } } }));
  page.on("dialog", dialog => dialog.accept());
});

async function save(page: Page) {
  const request = page.waitForRequest(request => request.url().endsWith("/api/campaigns/setup") && request.method() === "POST");
  await page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }).last().click();
  const payload = (await request).postDataJSON() as CampaignSetupInput;
  await expect(page.getByRole("dialog", { name: "Votre jeu est enregistré.", exact: true })).toBeVisible();
  return payload;
}

test("les trois polices passent la validation pour chaque roue et ticket, sans changer les défauts ni les affiches", () => {
  expect(BEAUTY_WHEEL_THEMES.map(theme => theme.font)).toEqual(["cormorant", "playfair", "dm-sans", "poppins", "bodoni", "space-grotesk"]);
  expect(beautyWheelFontOptions("beauty-botanical", "poster")).toEqual(["dm-sans", "roboto"]);
  expect(beautyWheelFontOptions("beauty-rose", "poster")).toEqual(["cormorant", "playfair"]);
  for (const template of templates) {
    for (const font of fonts) {
      const parsed = parseCampaignSetupInput({ gameType: template.id.includes("scratch") ? "scratch" : "wheel",
        presentation: { logo: {}, background: {}, heading: { fontFamily: font }, button: {}, wheel: {},
          layout: { templateId: template.id }, poster: { wheel: {} }, email: {} },
        accent: {}, rewardRules: {}, actions: [], prizes: [] }, "font-test-merchant");
      expect(parsed.presentation.heading.fontFamily).toBe(font);
      expect(parsed.presentation.layout.templateId).toBe(template.id);
    }
  }
});

for (const width of [320, 1280]) {
  test(`${width}px : objectif absent, nouveau jeu review_prompt et ancien objectif/actions conservés`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    for (const mode of ["wizard-new", "wizard-custom-goal"]) {
      await page.goto(fixture(mode));
      await page.getByRole("button", { name: "Continuer", exact: true }).click();
      await expect(page.getByText("Objectif", { exact: true })).toHaveCount(0);
      await expect(page.locator('option[value="review_prompt"]')).toHaveCount(0);
      await expect(page.getByText(/votre objectif|initialise les actions proposées/)).toHaveCount(0);
      await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Jeu de test typographique");
      await expect(page.getByRole("checkbox", { name: /Collecter l’e-mail avant le jeu/ })).toBeVisible();
      await page.getByRole("main").screenshot({ path: info.outputPath(`${mode}-${width}.png`) });
      const payload = await save(page);
      if (mode === "wizard-new") {
        expect(payload.goalType).toBe("review_prompt");
        expect(payload.successMetric).toBe("Avis Google");
        expect(payload.emailCaptureEnabled).toBe(false);
        expect(payload.actions).toEqual([]);
        expect(payload.targetUrl).toBeUndefined();
      } else {
        expect(payload.goalType).toBe("social_follow");
        expect(payload.successMetric).toBe("Abonnements sociaux");
        expect(payload.emailCaptureEnabled).toBe(true);
        expect(payload.actions).toEqual([{ id: "fixture-instagram", kind: "instagram", url: "https://instagram.com/fixture-test", label: "Notre compte" }]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}

for (const mode of ["wizard", "editor"]) {
  test(`${mode} : sélection des trois familles sur chaque roue et les tickets Beauté`, async ({ page }, info) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const template of templates) {
      await page.goto(fixture(mode, template.id));
      if (mode === "wizard") await selectWizardStep(page, 2);
      else await page.getByLabel("Activer le mode expert", { exact: true }).check();
      for (const [index, font] of fonts.entries()) {
        if (mode === "wizard") await page.getByLabel(/^Police du texte/).first().selectOption(font);
        else await page.getByRole("button", { name: fontNames[index], exact: true }).first().click();
        const preview = page.locator(`.okado-preview-surface[data-template-id="${template.id}"]`).first();
        await expect(preview.locator(`:is(h2,h3).font-${font}`)).toBeVisible();
      }
      if (mode === "wizard" && template.id === "beauty-botanical") {
        const payload = await save(page);
        expect(payload.presentation.heading.fontFamily).toBe("bodoni");
        // Rehydrate from the value actually serialized by the real Wizard.
        await page.goto(fixture(mode, template.id, payload.presentation.heading.fontFamily));
        await selectWizardStep(page, 2);
        await expect(page.getByLabel(/^Police du texte/).first()).toHaveValue("bodoni");
        await page.getByRole("main").screenshot({ path: info.outputPath("botanical-font-options.png") });
      }
    }
  });
}

for (const width of [320, 1280]) {
  test(`${width}px : les polices choisies atteignent aperçu intégré, prévisualisation et jeu public`, async ({ page }, info) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const mode of ["preview", "game-preview", "public"]) {
      for (const template of ["beauty-botanical", "beauty-scratch-botanical"]) {
        for (const font of fonts) {
          await page.goto(fixture(mode, template, font));
          const heading = page.locator(`:is(h1,h2,h3).font-${font}`).first();
          await expect(heading).toBeVisible();
          await expect(heading).toContainText(/Une surprise/);
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          const family = await heading.evaluate(element => getComputedStyle(element).fontFamily.toLowerCase());
          expect(family).toContain(font);
          const dimensions = await heading.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
          expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
          if (width === 320 && mode === "public" && template === "beauty-botanical")
            await page.screenshot({ path: info.outputPath(`${template}-${font}-320.png`), fullPage: true });
        }
      }
    }
    expect(errors).toEqual([]);
  });
}
