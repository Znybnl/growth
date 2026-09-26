import { expect, test } from "@playwright/test";

import {
  BEAUTY_WHEEL_THEMES,
  beautyWheelBackground,
  beautyWheelFontOptions,
  beautyWheelLegibleText,
  beautyWheelTheme,
  isBeautyIndustry,
  isBeautyWheelTemplate,
} from "../src/lib/beauty-wheel-themes";
import { buildBeautyWheelSegmentColors, limitBeautyWheelSegments } from "../src/lib/beauty-wheel-segments";
import { parseCampaignSetupInput } from "../src/lib/merchant-input";
import { buildWheelVisualSegments } from "../src/lib/wheel-segments";

test("la collection Beauté contient six thèmes distincts et reste réservée au secteur Beauté", () => {
  expect(BEAUTY_WHEEL_THEMES).toHaveLength(6);
  expect(new Set(BEAUTY_WHEEL_THEMES.map((theme) => theme.id)).size).toBe(6);
  expect(isBeautyIndustry("Beauté")).toBe(true);
  expect(isBeautyIndustry(" beauté ")).toBe(true);
  expect(isBeautyIndustry("Restauration")).toBe(false);
  expect(isBeautyWheelTemplate("classic")).toBe(false);
  for (const theme of BEAUTY_WHEEL_THEMES) {
    expect(isBeautyWheelTemplate(theme.id)).toBe(true);
    expect(beautyWheelTheme(theme.id)).toEqual(theme);
    expect(beautyWheelFontOptions(theme.id)).toContain(theme.font);
  }
  expect(beautyWheelFontOptions("classic")).toBeNull();
});

test("le fond partagé reprend les couleurs du marchand et conserve un texte lisible", () => {
  for (const theme of BEAUTY_WHEEL_THEMES) {
    const background = beautyWheelBackground(theme.id, "#112233", "#445566");
    expect(background).toContain("#112233");
    expect(background).not.toContain("url(");
  }
  expect(beautyWheelLegibleText("#ffffff", "#ffffff")).toBe("#171614");
  expect(beautyWheelLegibleText("#171126", "#ffffff")).toBe("#ffffff");
});

test("la validation conserve les couleurs et la police propres à un thème visité", () => {
  const remembered = {
    wheel: { rimColor: "#834969", winColor: "#e6d2af", alternateWinColor: "#e6d2af", loseColor: "#834969", alternateLoseColor: "#e6d2af" },
    backgroundColor: "#f6e9ee",
    scratchSignal: "#834969",
    headingTextColor: "#4b2440",
    logoTextColor: "#4b2440",
    headingFontFamily: "playfair",
    headingAlign: "left",
    logoAlign: "left",
    buttonBackgroundColor: "#834969",
  };
  const parsed = parseCampaignSetupInput({
    gameType: "wheel",
    accent: {},
    presentation: {
      logo: {}, background: {}, heading: {}, button: {}, wheel: {},
      layout: { templateId: "beauty-nude", wheelTemplateStyles: { "beauty-rose": remembered, "unknown-template": remembered } },
      poster: { wheel: {} }, email: {},
    },
    rewardRules: {}, actions: [], prizes: [],
  }, "merchant-test");
  expect(parsed.presentation.layout.wheelTemplateStyles?.["beauty-rose"]).toEqual(remembered);
  expect(Object.keys(parsed.presentation.layout.wheelTemplateStyles ?? {})).toEqual(["beauty-rose"]);
});

test("les roues Beauté sont plafonnées sans perdre le segment du gain effectivement tiré", () => {
  const prizes = Array.from({ length: 10 }, (_, index) => ({
    id: `prize-${index}`,
    label: `Lot ${index + 1}`,
    probability: 5,
  }));
  const segments = buildWheelVisualSegments(prizes);
  const capped = limitBeautyWheelSegments(segments, "prize-9", 9);
  const roseCapped = limitBeautyWheelSegments(segments, "prize-9", 8);

  expect(segments).toHaveLength(11);
  expect(capped).toHaveLength(9);
  expect(capped.at(-1)?.id).toBe("prize-9");
  expect(roseCapped).toHaveLength(8);
  expect(roseCapped.at(-1)?.id).toBe("prize-9");
});

test("aucune couleur de segment Beauté ne se répète entre deux voisins, fermeture comprise", () => {
  for (const theme of BEAUTY_WHEEL_THEMES) {
    for (const segmentCount of [8, 9]) {
      const colors = buildBeautyWheelSegmentColors(theme.id, segmentCount, "#ffffff", "#ffffff");
      expect(colors).toHaveLength(segmentCount);
      expect(new Set(colors).size).toBeGreaterThanOrEqual(segmentCount === 9 ? 3 : 2);
      for (let index = 0; index < colors.length; index += 1) {
        expect(colors[index]).not.toBe(colors[(index + 1) % colors.length]);
      }
    }
  }
});
