import { expect, test } from "@playwright/test";
import { assertNoPageOverflow, captureVisualAt1280, rejectAnalyticsForVisualTests } from "./helpers/visual-1280";

test.beforeEach(async ({ page, context, baseURL }) => {
  await rejectAnalyticsForVisualTests(context, baseURL!);
  await page.route(/https:\/\//, route => route.abort());
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, assets: {}, emailCount: 0 } }));
});

for (const template of ["beauty-nude", "beauty-botanical", "beauty-rose", "beauty-pop", "beauty-editorial", "beauty-tech", "rose-institut"]) {
  for (const mode of ["preview", "public"]) {
    test(`${template} ${mode} : headspa et les quatre autres lots visibles à 320/390 px`, async ({ page }, info) => {
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 740 });
        await page.goto(`/dev/beauty-wheel-backgrounds?template=${template}&mode=${mode}&prizes=headspa`);
        const frame = page.getByTestId("game-wheel-frame");
        const labels = frame.locator("svg text");
        await expect(labels).toHaveCount(8);
        const texts = await labels.allTextContents();
        for (const fragments of [["-15%", "PRESTATION"], ["-20%", "PRESTATION"], ["5€", "OFFERT"], ["LUXOPUNCTURE"], ["HEADSPA"]]) {
          expect(texts.some(text => fragments.every(fragment => text.includes(fragment)))).toBe(true);
        }
        expect(texts.some(text => /PERDU|DOMMAGE/.test(text))).toBe(true);
        await assertNoPageOverflow(page);
        if (template === "beauty-nude") await page.screenshot({ path: info.outputPath(`headspa-${mode}-${width}.png`), fullPage: true });
      }
    });
  }
}

test("@visual-1280 Nude : tous les lots dans le vrai cadre du wizard à 1280×720/600", async ({ page }, info) => {
  for (const height of [720, 600]) {
    await page.setViewportSize({ width: 1280, height });
    await page.goto("/dev/template-rendering-proof?mode=wizard-responsive-edit&template=beauty-nude&business=beauty&prizes=headspa");
    await page.getByRole("button", { name: "Voir l’aperçu", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Aperçu du jeu" });
    const labels = dialog.frameLocator("iframe").getByTestId("game-wheel-frame").locator("svg text");
    await expect(labels).toHaveCount(8);
    expect((await labels.allTextContents()).some(text => text.includes("HEADSPA"))).toBe(true);
    await captureVisualAt1280(page, info, "nude-wizard", height);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("wizard-footer").getByRole("button", { name: /Enregistrer/ })).toBeEnabled();
  }
});
