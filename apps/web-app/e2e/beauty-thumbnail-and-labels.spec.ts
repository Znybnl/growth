import { expect, test } from "@playwright/test";
import { BEAUTY_WHEEL_THEMES } from "../src/lib/beauty-wheel-themes";
import { signIn } from "./auth-session";

test("les miniatures Beauté et Éclat restent fidèles et les lots suivent leurs segments", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1366, height: 900 });
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle miniatures Beauté");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  const gallery = page.locator('section[aria-labelledby="beauty-wheel-templates-title"]');
  if (!(await gallery.count())) {
    test.skip(true, "Le compte de test courant n'appartient pas au secteur Beauté.");
  }
  await expect(gallery).toBeVisible();
  await expect(gallery.getByTestId("beauty-thumbnail-logo")).toHaveCount(7);
  for (const logo of await gallery.getByTestId("beauty-thumbnail-logo").all()) {
    await expect(logo).toHaveText("Votre établissement");
    expect(await logo.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await logo.evaluate((element) => getComputedStyle(element).textOverflow)).not.toBe("ellipsis");
  }
  const eclat = gallery.getByTestId("eclat-thumbnail");
  await expect(eclat).toHaveCSS("background-image", /243, 164, 196/);
  await expect(eclat.locator("[style*='conic-gradient']")).toHaveAttribute("style", /#f3a4c4/);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important}" });
  await gallery.screenshot({ path: testInfo.outputPath("beauty-thumbnails-1366.png"), animations: "disabled" });

  await page.setViewportSize({ width: 960, height: 850 });
  await gallery.screenshot({ path: testInfo.outputPath("beauty-thumbnails-960.png"), animations: "disabled" });
  for (const logo of await gallery.getByTestId("beauty-thumbnail-logo").all()) {
    expect(await logo.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }

  for (const theme of BEAUTY_WHEEL_THEMES) {
    await gallery.getByRole("button", { name: new RegExp(theme.name, "i") }).click();
    const labels = page.locator(`.okado-preview-surface[data-template-id="${theme.id}"] svg[viewBox="0 0 640 640"] text[transform]`);
    await expect(labels.first()).toBeVisible();
    const rotations = await labels.evaluateAll((elements) => elements.map((element) => element.getAttribute("transform")));
    expect(new Set(rotations).size).toBeGreaterThan(2);
  }

  await gallery.getByRole("button", { name: /^Éclat/ }).click();
  await expect(page.locator('.okado-preview-surface[data-template-id="rose-institut"] .okado-eclat-play-label')).toHaveCSS("font-weight", "700");
});
