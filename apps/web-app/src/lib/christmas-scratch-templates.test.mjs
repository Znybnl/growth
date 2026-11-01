import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { CHRISTMAS_SCRATCH_TEMPLATES, christmasScratchTemplate, christmasScratchBackgroundImage } from "./christmas-scratch-templates.ts";
import { parseCampaignSetupInput } from "./merchant-input.ts";
import { scratchVisualTheme, isImmersiveScratchTemplate } from "./beauty-scratch-templates.ts";
import { defaultScratchTextColor, defaultScratchTemplateFont, scratchTemplateDefaultBackground, scratchTemplatePrimaryColor, scratchTemplateUsesFixedPrimaryColor, scratchTemplateUsesTicketTextColor, wheelBackgroundForTemplateSelection, DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX } from "./campaign-defaults.ts";

for (const { id } of CHRISTMAS_SCRATCH_TEMPLATES) {
  const theme = christmasScratchTemplate(id);
  test(`${id}: enregistrement, moteur existant et paramètres initiaux`, () => {
    const form = parseCampaignSetupInput({ gameType: "scratch", rewardRules: {}, accent: {},
      presentation: { logo: {}, background: {}, heading: {}, button: {}, wheel: {}, poster: { wheel: {} }, email: {}, layout: { templateId: id } } }, "fixture-merchant");
    assert.equal(form.presentation.layout.templateId, id);
    assert.equal(isImmersiveScratchTemplate(id), true);
    assert.equal(scratchVisualTheme(id), theme);
    assert.equal(DEFAULT_SCRATCH_HEADING_FONT_SIZE_PX, 46);
    assert.equal(defaultScratchTemplateFont(id), theme.font);
    assert.equal(defaultScratchTextColor(id), theme.text);
    assert.equal(scratchTemplatePrimaryColor("#ff00ff", id), theme.scratch.base);
    assert.equal(scratchTemplateUsesFixedPrimaryColor(id), true);
    assert.equal(scratchTemplateUsesTicketTextColor(id), false);
    assert.equal(wheelBackgroundForTemplateSelection(id, "#ffffff"), theme.backgroundColor);
    for (const asset of [theme.background, theme.scratch.texture].filter(Boolean)) assert.ok(existsSync(`public${asset}`), asset);
    if (id === "scratch-christmas-evergreen" || id === "scratch-christmas-champagne" || id === "scratch-christmas-noir-or") assert.equal(theme.scratchShape, "brush");
    if (id === "scratch-christmas-retro") assert.equal(theme.scratchShape, "ticket");
  });
  test(`${id}: décor natif sans mutation, fond manuel prioritaire et isolé`, () => {
    const background = { mode: "color", color: theme.backgroundColor };
    const original = JSON.stringify(background);
    assert.equal(scratchTemplateDefaultBackground(id, background), theme.background);
    assert.equal(christmasScratchBackgroundImage(id, background), `url("${theme.background}")`);
    assert.equal(scratchTemplateDefaultBackground(id, { mode: "image", imageUrl: "manual.webp", color: theme.backgroundColor }), undefined);
    assert.equal(christmasScratchBackgroundImage(id, { mode: "image", imageUrl: "manual.webp" }), 'url("manual.webp")');
    assert.equal(christmasScratchBackgroundImage(id, { mode: "color", color: "#abcdef" }), "none");
    assert.equal(JSON.stringify(background), original);
    assert.equal(christmasScratchBackgroundImage("scratch-coral", background), undefined);
    assert.equal(scratchTemplateDefaultBackground("scratch-coral", background), undefined);
  });
}

test("les quatre modèles festifs gardent des noms neutres et des fonds présents dans la bibliothèque", async () => {
  const expected = [
    ["scratch-christmas-evergreen", "Vert bouteille & rubans", "builtin-scratch-gift-wrap"],
    ["scratch-christmas-champagne", "Ivoire & champagne", "builtin-scratch-champagne-ribbons"],
    ["scratch-christmas-retro", "Rayons rétro", "builtin-scratch-retro-rays"],
    ["scratch-christmas-noir-or", "Satin noir & or", "builtin-scratch-black-gold-ribbons"],
  ];
  const { builtInBackgroundAssets } = await import("./background-library.ts");
  for (const [id, name, backgroundId] of expected) {
    const theme = christmasScratchTemplate(id);
    assert.equal(theme.name, name);
    assert.equal(/no[eë]l|sapin/i.test(`${theme.name} ${theme.description} ${theme.sampleHeadline} ${theme.sampleSubline}`), false);
    const asset = builtInBackgroundAssets.find((asset) => asset.id === backgroundId);
    assert.equal(asset?.category, "Fête");
    assert.equal(asset?.imageUrl, theme.background);
  }
});
