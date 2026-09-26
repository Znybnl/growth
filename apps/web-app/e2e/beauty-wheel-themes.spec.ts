import { expect, test } from "@playwright/test";

import {
  BEAUTY_WHEEL_THEMES,
  beautyWheelBackground,
  beautyWheelButtonTextColor,
  beautyWheelFontOptions,
  beautyWheelLegibleText,
  beautyWheelTheme,
  isBeautyIndustry,
  isBeautyWheelTemplate,
} from "../src/lib/beauty-wheel-themes";
import { buildBeautyWheelSegmentColors, limitBeautyWheelSegments } from "../src/lib/beauty-wheel-segments";
import { DEFAULT_ROSE_INSTITUT_HEADING_FONT_FAMILY } from "../src/lib/campaign-defaults";
import { parseCampaignSetupInput } from "../src/lib/merchant-input";
import { rosePowderVisualSegments } from "../src/lib/wheel-segments";
import { buildWheelVisualSegments } from "../src/lib/wheel-segments";
import { limitCampaignSubtitleLines, MAX_BEAUTY_WHEEL_TITLE_LINES } from "../src/lib/campaign-defaults";

test("Rose poudré affiche huit segments sans masquer le résultat tiré", () => {
  const segments = Array.from({ length: 10 }, (_, index) => ({ id: `lot-${index}`, label: `LOT ${index}`, tone: "win" as const }));
  for (const winner of segments) {
    const visible = rosePowderVisualSegments(segments, winner.id);
    expect(visible).toHaveLength(8);
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

test("le template Éclat utilise Playfair Display par défaut", () => {
  expect(DEFAULT_ROSE_INSTITUT_HEADING_FONT_FAMILY).toBe("playfair");
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
    id: index === 9 ? "minus-ten" : `prize-${index}`,
    label: index === 9 ? "-10% PROCHAINE VISITE" : `Lot ${index + 1}`,
    probability: 5,
  }));
  const segments = buildWheelVisualSegments(prizes);
  const capped = limitBeautyWheelSegments(segments, "minus-ten");
  const cappedWhenNineIsRequested = limitBeautyWheelSegments(segments, "minus-ten", 9);

  expect(segments).toHaveLength(11);
  expect(capped).toHaveLength(8);
  expect(capped.at(-1)?.id).toBe("minus-ten");
  expect(capped.at(-1)?.label).toBe("-10% PROCHAINE VISITE");
  expect(cappedWhenNineIsRequested).toHaveLength(8);
  expect(cappedWhenNineIsRequested.at(-1)?.label).toBe("-10% PROCHAINE VISITE");
});

test("les boutons Nude & Or, Beauty Pop et Botanical adaptent leur texte au fond", () => {
  for (const templateId of ["beauty-nude", "beauty-pop", "beauty-botanical"] as const) {
    const theme = beautyWheelTheme(templateId)!;
    expect(beautyWheelButtonTextColor(templateId, theme.primary, theme.text)).toBe("#ffffff");
  }
  expect(beautyWheelButtonTextColor("beauty-botanical", "#ffffff", "#ffffff")).toBe("#171614");
  expect(beautyWheelButtonTextColor("beauty-botanical", "#243b2a", "#171614")).toBe("#ffffff");
});

test("aucune couleur de segment Beauté ne se répète entre deux voisins, fermeture comprise", () => {
  for (const theme of BEAUTY_WHEEL_THEMES) {
    for (const segmentCount of [7, 8]) {
      const colors = buildBeautyWheelSegmentColors(theme.id, segmentCount, "#ffffff", "#ffffff");
      expect(colors).toHaveLength(segmentCount);
      expect(new Set(colors).size).toBeGreaterThanOrEqual(2);
      for (let index = 0; index < colors.length; index += 1) {
        expect(colors[index]).not.toBe(colors[(index + 1) % colors.length]);
      }
    }
  }
});

test("les palettes par défaut des roues Beauté restent limitées à trois tons, quatre pour Beauty Pop", () => {
  for (const theme of BEAUTY_WHEEL_THEMES) {
    const colors = buildBeautyWheelSegmentColors(theme.id, 9, theme.primary, theme.secondary);
    const maximumTones = theme.id === "beauty-pop" ? 4 : 3;

    expect(new Set(colors).size, `${theme.id}: ${colors.join(", ")}`).toBeLessThanOrEqual(maximumTones);
    for (let index = 0; index < colors.length; index += 1) {
      expect(colors[index]).not.toBe(colors[(index + 1) % colors.length]);
    }
  }
});

test("les tons ivoire et blanc ne se retrouvent pas côte à côte, même à la fermeture de la roue", () => {
  const isLightNeutral = (hex: string) => {
    const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset + 1, offset + 3), 16) / 255);
    const brightness = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return brightness >= 0.86 && Math.max(...channels) - Math.min(...channels) <= 0.07;
  };

  for (const theme of BEAUTY_WHEEL_THEMES) {
    for (const [primary, secondary] of [
      [theme.primary, theme.secondary],
      ["#ffffff", "#ffffff"],
      ["#f4f0e8", "#f5f1ea"],
    ]) {
      const colors = buildBeautyWheelSegmentColors(theme.id, 9, primary, secondary);
      for (let index = 0; index < colors.length; index += 1) {
        const next = colors[(index + 1) % colors.length];
        expect(colors[index]).not.toBe(next);
        expect(isLightNeutral(colors[index]) && isLightNeutral(next)).toBe(false);
      }
    }
  }
});

test("le titre Beauté peut être saisi sur cinq lignes sans toucher à la limite standard", () => {
  const fiveLines = "Ligne 1\nLigne 2\nLigne 3\nLigne 4\nLigne 5\nLigne 6";

  expect(limitCampaignSubtitleLines(fiveLines, MAX_BEAUTY_WHEEL_TITLE_LINES)).toBe(
    "Ligne 1\nLigne 2\nLigne 3\nLigne 4\nLigne 5",
  );
  expect(limitCampaignSubtitleLines(fiveLines)).toBe("Ligne 1\nLigne 2\nLigne 3");
});
