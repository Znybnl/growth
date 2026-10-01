import { expect, test } from "@playwright/test";
import { BEAUTY_SCRATCH_TEMPLATES } from "../src/lib/beauty-scratch-templates";
import { signIn } from "./auth-session";

test("les tickets initiaux affichent le sous-titre, masquent les deux cartes retirées et personnalisent Cadeau lilas", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: /Ticket à gratter/ }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle ticket initial");
  const secondarySubtitle = page.getByLabel(/Sous-titre du ticket/);
  await expect(secondarySubtitle).toBeVisible();
  await secondarySubtitle.fill("Une surprise pour vous");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  await expect(page.getByRole("button", { name: /Carte confettis/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Rayons soleil/i })).toHaveCount(0);

  for (const template of [
    { id: "scratch-vault", label: "Coffre néon" },
    { id: "scratch-coral", label: "Corail joyeux" },
    { id: "scratch-lilac", label: "Cadeau lilas" },
  ]) {
    await page.getByRole("button", { name: new RegExp(template.label, "i") }).click();
    const preview = page.locator(`.okado-preview-surface[data-template-id="${template.id}"]`);
    await expect(preview).toBeVisible();
    await expect(preview.getByText("Une surprise pour vous")).toBeVisible();

    if (template.id === "scratch-lilac") {
      const primaryColor = page.getByRole("textbox", { name: "Couleur principale du ticket" }).first();
      await expect(primaryColor).toBeEnabled();
      await primaryColor.fill("#245780");
      await expect(primaryColor).toHaveValue("#245780");
      await expect.poll(() => preview.locator(":scope > div").evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("36, 87, 128");
      await preview.screenshot({
        path: testInfo.outputPath("cadeau-lilas-custom-color-and-subtitle.png"),
        animations: "disabled",
      });
    }
  }
});

test("les espacements avancés contrôlent bien le rendu d’un ticket à gratter", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: /Ticket à gratter/ }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle espacements ticket");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  await page.getByText("Paramètres avancés").click();
  const logoSpacing = page.getByRole("slider", { name: "Espacement sous le logo (px)" });
  const scratchSpacing = page.getByRole("slider", { name: "Espacement entre le texte et la zone à gratter (px)" });
  await expect(logoSpacing).toBeVisible();
  await expect(scratchSpacing).toBeVisible();

  const preview = page.locator(".okado-preview-surface").first();
  const scratchSurface = preview.locator("canvas").locator("xpath=..");
  for (const slider of [logoSpacing, scratchSpacing]) {
    await slider.focus();
    await slider.press("Home");
  }
  await expect.poll(() => scratchSurface.evaluate((element) => (element as HTMLElement).style.marginTop)).toBe("0px");
  await expect.poll(() => preview.locator("div[style*='margin-bottom']").first().evaluate((element) => (element as HTMLElement).style.marginBottom)).toBe("0px");

  await scratchSpacing.focus();
  await scratchSpacing.press("ArrowRight");
  await expect.poll(() => scratchSurface.evaluate((element) => (element as HTMLElement).style.marginTop)).toBe("1px");
  await page.screenshot({ path: testInfo.outputPath("scratch-spacing-zero-and-one.png") });
});

test("les cinq tickets Beauté restent lisibles et chargent leur fond sur plusieurs écrans", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto("/campaigns/new/guided");
  await page.getByRole("button", { name: /Ticket à gratter/ }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.getByPlaceholder("Ex. La roue gourmande de juin").fill("Contrôle visuel tickets Beauté");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();

  const gallery = page.locator('section[aria-labelledby="beauty-scratch-templates-title"]');
  if (!(await gallery.count())) {
    test.skip(true, "Le compte de test courant n'appartient pas au secteur Beauté.");
  }
  await expect(gallery).toBeVisible();
  await expect(gallery.getByRole("button")).toHaveCount(5);

  const subtitleInput = page.getByLabel(/Sous-titre du ticket/);
  await subtitleInput.fill("Des soins délicats pour votre bien-être");
  await expect(page.getByText("Des soins délicats pour votre bien-être").last()).toBeVisible();

  await page.getByText("Paramètres avancés").click();
  const logoSpacing = page.getByRole("slider", { name: "Espacement sous le logo (px)" });
  const scratchSpacing = page.getByRole("slider", { name: "Espacement entre le texte et la zone à gratter (px)" });
  const subtitleSpacing = page.getByRole("slider", { name: "Espacement entre le titre et le sous-titre du ticket (px)" });
  await expect(scratchSpacing).toBeVisible();
  await expect(subtitleSpacing).toBeVisible();
  await expect(logoSpacing).toBeVisible();
  for (const slider of [logoSpacing, scratchSpacing, subtitleSpacing]) {
    await slider.focus();
    await slider.press("Home");
  }

  await subtitleInput.fill("");
  await expect(page.getByText("Des soins délicats pour votre bien-être")).toHaveCount(0);
  await subtitleInput.fill("Des soins délicats pour votre bien-être");

  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await expect(gallery).toBeVisible();
    for (const card of await gallery.getByRole("button").all()) {
      expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await gallery.screenshot({
      path: testInfo.outputPath(`beauty-scratch-gallery-${width}.png`),
      animations: "disabled",
    });
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of BEAUTY_SCRATCH_TEMPLATES) {
    const card = gallery.getByRole("button", { name: new RegExp(theme.name, "i") });
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    const preview = page.locator(`.okado-preview-surface[data-template-id="${theme.id}"]`);
    await expect(preview).toBeVisible();
    const resultHint = preview.getByText("Le résultat s'affiche automatiquement.", { exact: true });
    await expect.poll(() => resultHint.evaluate((element) => getComputedStyle(element).marginTop)).toBe("20px");
    await expect.poll(() => preview.getByText("Des soins délicats pour votre bien-être", { exact: true }).evaluate((element) => (element as HTMLElement).style.marginTop)).toBe("0px");
    const scratchSurface = preview.locator(`canvas[data-foil-texture="${theme.id}"]`).locator("xpath=..");
    await expect.poll(() => scratchSurface.evaluate((element) => (element as HTMLElement).style.marginTop)).toBe("0px");
    await expect.poll(() => preview.locator("div[style*='margin-bottom']").first().evaluate((element) => (element as HTMLElement).style.marginBottom)).toBe("0px");
    const art = preview.locator(`img[data-template-art="${theme.id}"]`);
    await expect(art).toBeVisible();
    await expect.poll(() => art.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true);
    const assetResponse = await page.request.get(theme.background);
    expect(assetResponse.ok()).toBe(true);
    expect(assetResponse.headers()["content-type"]).toContain("image/webp");
    const foil = preview.locator(`canvas[data-foil-texture="${theme.id}"]`);
    await expect(foil).toHaveAttribute("data-foil-loaded", "true");
    const foilResponse = await page.request.get(theme.scratch.texture);
    expect(foilResponse.ok()).toBe(true);
    expect(foilResponse.headers()["content-type"]).toContain("image/webp");
    await scratchSpacing.focus();
    await scratchSpacing.press("ArrowRight");
    await expect.poll(() => scratchSurface.evaluate((element) => (element as HTMLElement).style.marginTop)).toBe("1px");
    await expect.poll(() => resultHint.evaluate((element) => getComputedStyle(element).marginTop)).toBe("20px");
    await scratchSpacing.focus();
    await scratchSpacing.press("Home");
    await preview.screenshot({
      path: testInfo.outputPath(`${theme.id}-390.png`),
      animations: "disabled",
    });
  }
});
