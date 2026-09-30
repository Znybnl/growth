import { expect, test } from "@playwright/test";
import { getPosterLogoLayout } from "../src/lib/poster-render";
import { POSTER_TEMPLATES } from "../src/lib/poster-templates";
import { createPosterSettingsDefaults } from "../src/lib/poster-utils";

test("la taille du logo texte est indépendante de sa position et de sa marge", () => {
  const basePoster = createPosterSettingsDefaults({
    templateId: "classic-wheel",
    logoMode: "text",
    logoText: "Institut de beauté",
    logoSizePercent: 70,
    logoBottomMarginPx: 17,
    wheel: POSTER_TEMPLATES[0].wheel,
  });

  for (const template of POSTER_TEMPLATES) {
    const regular = getPosterLogoLayout(basePoster, template);
    const enlarged = getPosterLogoLayout({ ...basePoster, logoSizePercent: 150 }, template);

    expect(enlarged.textFontSize).toBeGreaterThan(regular.textFontSize ?? 0);
    expect(regular.textFirstLineY! - (regular.textFontSize ?? 0) * 0.82).toBeCloseTo(regular.logoY);
    expect(enlarged.textFirstLineY! - (enlarged.textFontSize ?? 0) * 0.82).toBeCloseTo(enlarged.logoY);
    expect(regular.logoY).toBe(enlarged.logoY);
    expect(regular.bottomY - regular.visualBottomY).toBe(17);
    expect(enlarged.bottomY - enlarged.visualBottomY).toBe(17);
  }
});

test("la géométrie du logo image reste dimensionnée par son contrôle de taille", () => {
  const poster = createPosterSettingsDefaults({
    templateId: "classic-wheel",
    logoMode: "image",
    logoUrl: "https://example.test/logo.png",
    logoSizePercent: 70,
    logoBottomMarginPx: 17,
    wheel: POSTER_TEMPLATES[0].wheel,
  });

  const layout = getPosterLogoLayout(poster, POSTER_TEMPLATES[0]);

  expect(layout.logoSize).toBeCloseTo(119);
  expect(layout.visualBottomY).toBeCloseTo(layout.logoY + 119);
  expect(layout.bottomY - layout.visualBottomY).toBe(17);
});
