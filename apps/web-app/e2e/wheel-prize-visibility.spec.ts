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
        const short = labels.filter({ hasText: /^PERDU$/ }).first();
        await expect(short).toHaveAttribute("font-size", (await short.getAttribute("data-base-font-size"))!);
        if (template === "beauty-nude") {
          const long = labels.filter({ hasText: /LUXOPUNCTURE/ });
          await expect.poll(async () => Number(await long.getAttribute("font-size"))).toBeLessThan(25);
          const metrics = await long.evaluate(node => {
            const text = node as SVGTextElement;
            return {width:text.getBBox().width,radius:Number(text.dataset.labelRadius),button:Number(text.dataset.buttonRadius)};
          });
          expect(metrics.radius - metrics.width / 2).toBeGreaterThanOrEqual(metrics.button + 5);
          await expect(long).not.toHaveAttribute("textLength", /.+/);
        }
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
    await expect.poll(async () => Number(await labels.filter({hasText:/LUXOPUNCTURE/}).getAttribute("font-size"))).toBeLessThan(25);
    await expect(labels.filter({hasText:/^PERDU$/}).first()).toHaveAttribute("font-size","25");
    await captureVisualAt1280(page, info, "nude-wizard", height);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("wizard-footer").getByRole("button", { name: /Enregistrer/ })).toBeEnabled();
  }
});
