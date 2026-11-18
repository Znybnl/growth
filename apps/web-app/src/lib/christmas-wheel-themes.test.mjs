import assert from "node:assert/strict";
import test from "node:test";
import { CHRISTMAS_WHEEL_THEMES, christmasWheelDefaultBackground, christmasWheelPalette, christmasWheelSegmentColors } from "./christmas-wheel-themes.ts";
import { parseCampaignSetupInput } from "./merchant-input.ts";
import { wheelBackgroundForTemplateSelection, wheelHeadingFontForTemplateSelection, wheelHeadingColorForTemplateSelection, wheelLogoColorForTemplateSelection, defaultScratchTextColor, defaultScratchLogoColor } from "./campaign-defaults.ts";
import { contrastRatio, legibleSegmentTextColor } from "./color-contrast.ts";
import { buildWheelVisualSegments, selectWheelVisualSegments } from "./wheel-segments.ts";
import { TRAVEL_WHEEL_THEMES } from "./travel-wheel-themes.ts";
import { TRAVEL_SCRATCH_THEMES } from "./travel-scratch-themes.ts";

for (const theme of TRAVEL_WHEEL_THEMES) {
  test(`${theme.id}: modèle persistant, fond natif et fond personnalisé`, () => {
    const form = parseCampaignSetupInput({ gameType: "wheel", rewardRules: {}, accent: {}, presentation: { logo: {}, background: {}, heading: {}, button: {}, wheel: {}, poster: { wheel: {} }, email: {}, layout: { templateId: theme.id } } }, "fixture-merchant");
    assert.equal(form.presentation.layout.templateId, theme.id);
    assert.equal(christmasWheelDefaultBackground(theme.id, { color: theme.background }), theme.artwork);
    assert.equal(christmasWheelDefaultBackground(theme.id, { color: theme.background, imageUrl: "/manual.webp" }), null);
    assert.equal(christmasWheelDefaultBackground(theme.id, { color: "#abcdef" }), null);
    assert.equal(christmasWheelPalette(theme.id, form.presentation.wheel).rimColor, theme.rim);
  });
}

test("Road trip : textes par défaut assombris et cohérents entre roue et ticket", () => {
  const wheel = TRAVEL_WHEEL_THEMES.find(theme => theme.id === "travel-roadtrip");
  const scratch = TRAVEL_SCRATCH_THEMES.find(theme => theme.id === "travel-scratch-roadtrip");
  assert.ok(wheel && scratch);
  assert.equal(wheel.text, "#922d16");
  assert.equal(wheel.logo, "#06243b");
  assert.equal(scratch.text, wheel.text);
  assert.equal(scratch.logo, wheel.logo);
  assert.equal(wheelHeadingColorForTemplateSelection(wheel.id, "#ffffff"), wheel.text);
  assert.equal(wheelLogoColorForTemplateSelection(wheel.id, "#ffffff"), wheel.logo);
  assert.equal(defaultScratchTextColor(scratch.id), scratch.text);
  assert.equal(defaultScratchLogoColor(scratch.id), scratch.logo);
  assert.ok(contrastRatio(wheel.text, wheel.background) >= 4.5);
  assert.ok(contrastRatio(wheel.logo, wheel.background) >= 4.5);
});

for (const theme of CHRISTMAS_WHEEL_THEMES) {
  test(`${theme.id}: parsing conservé et couleurs initiales isolées`, () => {
    const form = parseCampaignSetupInput({ gameType: "wheel", rewardRules: {}, accent: {},
      presentation: { logo: {}, background: {}, heading: {}, button: {}, wheel: {}, poster: { wheel: {} }, email: {}, layout: { templateId: theme.id } } }, "fixture-merchant");
    const initial = JSON.stringify(form);
    assert.equal(form.presentation.layout.templateId, theme.id);
    assert.equal(wheelBackgroundForTemplateSelection(theme.id, "#000000"), theme.background);
    assert.equal(wheelHeadingColorForTemplateSelection(theme.id, "#000000"), theme.text);
    assert.equal(wheelLogoColorForTemplateSelection(theme.id, "#000000"), theme.logo);
    assert.equal(wheelHeadingFontForTemplateSelection(theme.id, "fredoka"), "bodoni");
    const palette = christmasWheelPalette(theme.id, form.presentation.wheel);
    assert.equal(palette.rimColor, theme.rim);
    assert.equal(JSON.stringify(form), initial);
  });

  test(`${theme.id}: priorité du fond manuel et contraste des trois couleurs de segments`, () => {
    assert.ok(christmasWheelDefaultBackground(theme.id, { color: theme.background }));
    assert.equal(christmasWheelDefaultBackground(theme.id, { color: "#abcdef" }), null);
    assert.equal(christmasWheelDefaultBackground(theme.id, { color: theme.background, imageUrl: "manual-image.webp" }), null);
    const colors = christmasWheelSegmentColors(theme.id, 9, { loseColor: theme.primary, alternateLoseColor: theme.secondary, winColor: theme.third });
    for (const color of colors) assert.ok(contrastRatio(color, legibleSegmentTextColor(color, theme.logo)) >= 4.5);
    for (let count = 2; count <= 50; count++) {
      const fills = christmasWheelSegmentColors(theme.id, count, { loseColor: theme.primary, alternateLoseColor: theme.secondary, winColor: theme.third });
      for (let index = 0; index < count; index++) assert.notEqual(fills[index], fills[(index + 1) % count]);
    }
  });
}

test("la cible de six secteurs conserve tous les lots et le gagnant exact au-delà de six", () => {
  const prizes = Array.from({ length: 12 }, (_, index) => ({ id: `prize-${index}`, label: `Lot ${index}`, probability: 5 }));
  const source = buildWheelVisualSegments(prizes);
  const before = JSON.stringify(source);
  for (const winner of source) {
    const visible = selectWheelVisualSegments(source, winner.id, 6);
    for (const prize of prizes) assert.ok(visible.some(item => item.id.replace(/-visual-\d+$/, "") === prize.id));
    assert.ok(visible.some(item => item.id === winner.id));
  }
  assert.equal(JSON.stringify(source), before);
});
