import { expect, test } from "@playwright/test";
import { enforceMinimumWheelPrizeLabelFontSize } from "../src/lib/wheel-labels";

import {
  DEFAULT_COCORICO_DUO_YELLOW,
  DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR,
  DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR,
  campaignWheelBlockSpacingPx,
  deriveLighterHex,
  dynamicWheelLightSegmentColor,
  wheelPaletteForTemplate,
  wheelBackgroundForTemplate,
  wheelBackgroundForTemplateSelection,
  wheelHeadingColorForTemplateSelection,
} from "../src/lib/campaign-defaults";

test("un espacement réglé à zéro garde un dégagement structurel avant la roue", () => {
  expect(campaignWheelBlockSpacingPx(0)).toBe(24);
  expect(campaignWheelBlockSpacingPx(12)).toBe(24);
  expect(campaignWheelBlockSpacingPx(24)).toBe(24);
  expect(campaignWheelBlockSpacingPx(25)).toBe(25);
  expect(campaignWheelBlockSpacingPx(80)).toBe(80);
});

test("les libellés de lots des roues ne descendent jamais sous 25 px", () => {
  for (const currentSize of [17, 20, 22, 23, 24, 25]) {
    expect(enforceMinimumWheelPrizeLabelFontSize(currentSize)).toBe(25);
  }
  expect(enforceMinimumWheelPrizeLabelFontSize(26)).toBe(26);
  expect(enforceMinimumWheelPrizeLabelFontSize(30)).toBe(30);
});

test("Dynamique ne reprend pas le fond jaune de Bicolore à sa première sélection", () => {
  expect(wheelBackgroundForTemplateSelection("classic", DEFAULT_COCORICO_DUO_YELLOW)).toBe("#ffffff");
  expect(wheelBackgroundForTemplateSelection("classic", "#2563eb")).toBe("#ffffff");
});

test("Dynamique éclaircit ses segments clairs par défaut sans écraser une couleur secondaire choisie", () => {
  const primary = DEFAULT_CLASSIC_WHEEL_PRIMARY_COLOR;
  const legacyLight = deriveLighterHex(primary);
  const updatedLight = deriveLighterHex(primary, 0.7);
  expect(wheelPaletteForTemplate("classic", {
    rimColor: legacyLight,
    winColor: "#ffffff",
    alternateWinColor: "#ffffff",
    loseColor: primary,
    alternateLoseColor: legacyLight,
  }).alternateLoseColor).toBe(updatedLight);
  expect(dynamicWheelLightSegmentColor(primary, legacyLight)).toBe(updatedLight);
  expect(dynamicWheelLightSegmentColor(primary, updatedLight)).toBe(updatedLight);
  expect(dynamicWheelLightSegmentColor(primary, "#f0dcbb")).toBe("#f0dcbb");
});

test("Signature démarre sur un fond neutre et chaque modèle a sa couleur de titre", () => {
  expect(wheelBackgroundForTemplateSelection("restaurant-pop", "#003cb9")).toBe("#fffdfa");
  expect(wheelPaletteForTemplate("restaurant-pop", {
    rimColor: "#ffffff", winColor: "#ffffff", alternateWinColor: "#ffffff",
    loseColor: "#003cb9", alternateLoseColor: "#ffffff",
  }).winColor).toBe("#faf9f7");
  expect(wheelHeadingColorForTemplateSelection("classic", "#1b2842")).toBe("#ffffff");
  expect(wheelHeadingColorForTemplateSelection("restaurant-pop", "#ffffff")).toBe("#1b2842");
  expect(wheelBackgroundForTemplate("restaurant-pop", "#ced9e8")).toBe("#ced9e8");
});

test("Éclat initialise son fond rose après un template sombre", () => {
  expect(wheelBackgroundForTemplateSelection("rose-institut", "#171126")).toBe(
    DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR,
  );
  expect(wheelBackgroundForTemplateSelection("rose-institut", "#24183a")).toBe(
    DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR,
  );
});

test("les fonds personnalisés enregistrés restent inchangés au chargement", () => {
  expect(wheelBackgroundForTemplate("classic", DEFAULT_COCORICO_DUO_YELLOW)).toBe(DEFAULT_COCORICO_DUO_YELLOW);
  expect(wheelBackgroundForTemplate("classic", "#aabbcc")).toBe("#aabbcc");
  expect(wheelBackgroundForTemplateSelection("cocorico-duo-wheel", "#ffffff")).toBe(DEFAULT_COCORICO_DUO_YELLOW);
});
