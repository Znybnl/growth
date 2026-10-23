import { expect, test, type Page } from "@playwright/test";
import { selectWizardStep } from "./helpers/wizard-step";
import { BEAUTY_SCRATCH_TEMPLATES, IMMERSIVE_SCRATCH_TEMPLATE_IDS } from "../src/lib/beauty-scratch-templates";
import { resolveScratchTemplateTextColor } from "../src/lib/campaign-defaults";

async function isolate(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ json: { campaign: { actions: [] }, suggestions: [], items: [], assets: {} } }));
}

function url(mode: string, template: string, extra: Record<string, string> = {}) {
  return `/dev/template-rendering-proof?${new URLSearchParams({ mode, template, ...extra })}`;
}

test("Cadeau lilas corrige le bleu hérité sans modifier une couleur propre ni les autres templates", () => {
  expect(resolveScratchTemplateTextColor("#003cb4", "scratch-lilac")).toBe("#210b32");
  expect(resolveScratchTemplateTextColor("#123456", "scratch-lilac")).toBe("#123456");
  expect(resolveScratchTemplateTextColor("#003cb4", "scratch-coral")).toBe("#003cb4");
});

for (const width of [320, 390, 1280]) {
  for (const mode of ["preview", "public", "game-preview"]) {
    test(`${mode} ${width}px : les sauts de ligne de Dynamique et Signature sont conservés`, async ({ page }, info) => {
      await isolate(page);
      await page.setViewportSize({ width, height: 900 });
      for (const template of ["classic", "restaurant-pop"]) {
        await page.goto(url(mode, template));
        const heading = page.locator(".okado-cocorico-promo-line");
        await expect(heading).toHaveCSS("white-space", "pre-line");
        const lineTops = await heading.evaluate(element => {
          const text = element.firstChild!;
          const value = text.textContent!;
          return [0, value.indexOf("\n") + 1].map(index => {
            const range = document.createRange();
            range.setStart(text, index); range.setEnd(text, index + 1);
            return range.getBoundingClientRect().top;
          });
        });
        expect(lineTops[1]).toBeGreaterThan(lineTops[0] + 10);
        if (width === 390) await page.screenshot({ path: info.outputPath(`${mode}-${template}.png`), fullPage: true });
      }
    });
  }
}

for (const mode of ["preview", "public", "game-preview"]) {
  test(`${mode} : Bicolore suit la couleur principale, les fonds manuels restent prioritaires`, async ({ page }, info) => {
    await isolate(page);
    await page.setViewportSize({ width: 390, height: 850 });
    const surface = page.locator(mode === "preview" ? ".okado-preview-surface > div" : ".okado-public-experience");
    await page.goto(url(mode, "cocorico-duo-wheel", { background: "#f2c94c" }));
    await expect(surface).toHaveCSS("background-color", "rgb(120, 180, 223)");
    await expect(surface).toHaveCSS("background-image", /120, 180, 223/);
    await expect(surface.getByRole("img", { name: "Roue de la fortune", exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`bicolore-${mode}.png`), fullPage: true });
    await page.goto(url(mode, "cocorico-duo-wheel", { background: "#e8dccc" }));
    await expect(surface).toHaveCSS("background-color", "rgb(232, 220, 204)");
    await page.goto(url(mode, "cocorico-duo-wheel", { background: "image" }));
    await expect(surface).toHaveCSS("background-image", /aurora-retail/);
  });

  test(`${mode} : les onze tickets n'affichent plus les phrases sous le grattage`, async ({ page }, info) => {
    await isolate(page);
    await page.setViewportSize({ width: 390, height: 850 });
    for (const template of IMMERSIVE_SCRATCH_TEMPLATE_IDS) {
      await page.goto(url(mode, template, { ink: "#003cb4" }));
      await expect(page.locator("canvas").first()).toBeVisible();
      const ticket = page.getByTestId("scratch-ticket-surface");
      await expect(ticket).toBeVisible();
      const ticketWidth = await ticket.evaluate((node) => Number.parseFloat(getComputedStyle(node).width));
      expect(ticketWidth).toBeLessThanOrEqual(216);
      await expect(page.getByText(/Le résultat s'affiche automatiquement|Le résultat apparaît dès|Le gain sera disponible selon|Votre gain sera confirmé après/)).toHaveCount(0);
      if (template === "scratch-lilac") {
        await expect(page.getByText("Établissement de test", { exact: true }).first()).toHaveCSS("color", "rgb(33, 11, 50)");
        await expect(page.getByText("Découvrez votre cadeau", { exact: true })).toHaveCSS("color", "rgba(33, 11, 50, 0.85)");
        await page.screenshot({ path: info.outputPath(`cadeau-lilas-${mode}.png`), fullPage: true });
      }
    }
  });
}

test("game-preview : les textures d’origine des onze tickets sont réellement peintes dans la couche à gratter", async ({ page }, info) => {
  await isolate(page);
  await page.setViewportSize({ width: 390, height: 850 });

  for (const template of IMMERSIVE_SCRATCH_TEMPLATE_IDS) {
    await page.goto(url("game-preview", template));
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    if (BEAUTY_SCRATCH_TEMPLATES.some((theme) => theme.id === template)) {
      await expect(canvas).toHaveAttribute("data-foil-loaded", "true");
    }
    const cover = await canvas.evaluate((element) => {
      const context = (element as HTMLCanvasElement).getContext("2d");
      if (!context) throw new Error("Canvas 2D indisponible");
      const { width, height } = element as HTMLCanvasElement;
      const pixels = context.getImageData(0, 0, width, height).data;
      let maxAdjacentPixelDelta = 0;
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width - 1; x += 2) {
          const index = (y * width + x) * 4;
          const right = index + 4;
          maxAdjacentPixelDelta = Math.max(
            maxAdjacentPixelDelta,
            Math.abs(pixels[index] - pixels[right]),
            Math.abs(pixels[index + 1] - pixels[right + 1]),
            Math.abs(pixels[index + 2] - pixels[right + 2]),
          );
        }
      }
      return {
        opaque: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]].every(([x, y]) =>
          context.getImageData(Math.round(width * x), Math.round(height * y), 1, 1).data[3] === 255,
        ),
        maxAdjacentPixelDelta,
      };
    });
    expect(cover.opaque, `${template}: le revêtement d’origine doit rester opaque`).toBe(true);
    expect(cover.maxAdjacentPixelDelta, `${template}: le motif du revêtement doit être peint dans le canvas`).toBeGreaterThan(8);
    if (template === "beauty-scratch-noir-or") {
      await page.screenshot({ path: info.outputPath("scratch-noir-or-original-texture.png"), fullPage: true });
    }
  }
});

for (const mode of ["wizard", "editor"]) {
  test(`${mode} : modifier la couleur principale de Bicolore met à jour son fond`, async ({ page }) => {
    await isolate(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(url(mode, "cocorico-duo-wheel", { background: "#f2c94c" }));
    if (mode === "wizard") await selectWizardStep(page, 2);
    else await page.getByLabel("Activer le mode expert", { exact: true }).check();
    const primary = page.getByLabel(mode === "wizard" ? "Couleur principale de la roue" : "Couleur principale", { exact: true }).first();
    await primary.fill("#125634");
    await expect(primary).toHaveValue("#125634");
    const surface = page.locator('.okado-preview-surface[data-template-id="cocorico-duo-wheel"] > div').first();
    await expect(surface).toHaveCSS("background-color", "rgb(18, 86, 52)");
    await primary.fill("#456789");
    await expect(surface).toHaveCSS("background-color", "rgb(69, 103, 137)");
  });

  test(`${mode} : les couleurs propres à Cadeau lilas survivent au changement de template`, async ({ page }) => {
    await isolate(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(url(mode, "scratch-lilac", { ink: "#003cb4" }));
    if (mode === "wizard") await selectWizardStep(page, 2);
    if (mode === "wizard") await page.getByText("Paramètres avancés", { exact: false }).first().click();
    else await page.getByLabel("Activer le mode expert", { exact: true }).check();
    const logoColor = page.getByLabel("Couleur du logo et sous-titre", { exact: true }).first();
    await expect(logoColor).toHaveValue("#210b32");
    await logoColor.fill("#123456");
    await page.getByRole("button", { name: /Corail joyeux/ }).first().click();
    await page.getByRole("button", { name: /Cadeau lilas/ }).first().click();
    await expect(logoColor).toHaveValue("#123456");
  });
}
