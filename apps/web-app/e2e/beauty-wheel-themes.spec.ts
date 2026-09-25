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
import { parseCampaignSetupInput } from "../src/lib/merchant-input";
import { rosePowderVisualSegments } from "../src/lib/wheel-segments";

test("Rose poudré affiche sept segments sans masquer le résultat tiré", () => {
  const segments = Array.from({ length: 10 }, (_, index) => ({ id: `lot-${index}`, label: `LOT ${index}`, tone: "win" as const }));
  for (const winner of segments) {
    const visible = rosePowderVisualSegments(segments, winner.id);
    expect(visible).toHaveLength(7);
    expect(visible.some((segment) => segment.id === winner.id)).toBe(true);
  }
  expect(segments).toHaveLength(10);
});

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
