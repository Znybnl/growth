import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { HALLOWEEN_SCRATCH_TEMPLATE as theme } from "./halloween-scratch-template.ts";
import { scratchVisualTheme, isImmersiveScratchTemplate, isBeautyScratchTemplate } from "./beauty-scratch-templates.ts";
import { parseCampaignSetupInput } from "./merchant-input.ts";
import { defaultScratchTextColor, defaultScratchTemplateFont, scratchTemplateDefaultBackground, scratchTemplatePrimaryColor, scratchTemplateUsesFixedPrimaryColor, scratchTemplateUsesTicketTextColor, wheelBackgroundForTemplateSelection, resolveScratchTemplateTextColor } from "./campaign-defaults.ts";

test("Halloween ticket is saved independently from the wheel and keeps configured rewards", () => {
  const input = { gameType: "scratch", subtitle: "Mon texte personnalisé", rewardRules: {}, accent: {},
    prizes: [{ id: "fixture-prize", label: "Soin offert", probability: 5 }],
    presentation: { logo: {}, background: {}, heading: {}, button: {}, wheel: {}, poster: { wheel: {} }, email: {}, layout: { templateId: theme.id } } };
  const before = JSON.stringify(input);
  const form = parseCampaignSetupInput(input, "fixture-merchant");
  assert.equal(form.presentation.layout.templateId, theme.id);
  assert.equal(form.subtitle, input.subtitle);
  assert.equal(form.prizes.length, 1);
  assert.equal(form.prizes[0].probability, 5);
  assert.equal(JSON.stringify(input), before);
  assert.equal(isImmersiveScratchTemplate(theme.id), true);
  assert.equal(isBeautyScratchTemplate(theme.id), false);
  assert.equal(scratchVisualTheme(theme.id), theme);
  assert.equal(defaultScratchTemplateFont(theme.id), "bodoni");
});

test("Halloween palette and original assets cannot inherit another template's colors", () => {
  assert.equal(defaultScratchTextColor(theme.id), theme.text);
  assert.equal(resolveScratchTemplateTextColor("#003cb4", theme.id), theme.text);
  assert.equal(scratchTemplatePrimaryColor("#ff00ff", theme.id), theme.scratch.base);
  assert.equal(scratchTemplateUsesFixedPrimaryColor(theme.id), true);
  assert.equal(scratchTemplateUsesTicketTextColor(theme.id), false);
  assert.equal(wheelBackgroundForTemplateSelection(theme.id, "#ffffff"), theme.backgroundColor);
  assert.equal(scratchTemplateDefaultBackground(theme.id, { mode: "image", imageUrl: "manual.webp" }), theme.background);
  for (const asset of [theme.background, theme.scratch.texture, "/images/templates/halloween-gold/wordmark-v3.webp"]) assert.ok(existsSync(`public${asset}`));
  assert.match(readFileSync("../../.vercelignore", "utf8"), /!apps\/web-app\/public\/images\/templates\/halloween-gold\/\*\.webp/);
});
