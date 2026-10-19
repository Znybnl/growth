import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultPosterSettings } from "./campaign-defaults.ts";
import { normalizePosterSettings } from "./poster-utils.ts";

const merchant = { id: "fixture", companyName: "Institut de test", logoText: "Institut de test", createdAt: "2026-10-19" };

test("a new Beauty poster starts with the complete Elegance appearance", () => {
  const poster = createDefaultPosterSettings({ ...merchant, industry: "Beauté" }, "#003cb9");
  assert.equal(poster.templateId, "premium-wheel");
  assert.equal(poster.headlineFontFamily, "cormorant");
  assert.equal(poster.headlineTextColor, "#111111");
  assert.equal(poster.backgroundColor, "#f7f2ec");
  assert.equal(poster.wheel.winColor, "#d8c8b8");
  assert.equal(poster.logoText, merchant.companyName);
});

test("other sectors and missing industry keep Classic with the campaign primary color", () => {
  for (const industry of [undefined, "", "Restauration", "Retail", "Services"]) {
    const poster = createDefaultPosterSettings({ ...merchant, industry }, "#123456");
    assert.equal(poster.templateId, "classic-wheel");
    assert.equal(poster.wheel.winColor, "#123456");
    assert.equal(poster.headlineFontFamily, "geogrotesque");
  }
});

test("a previously selected Classic poster and its custom text remain selected for Beauty", () => {
  const saved = { ...createDefaultPosterSettings(merchant), headline: "Mon texte conservé", logoText: "Mon logo" };
  const normalized = normalizePosterSettings(saved, createDefaultPosterSettings({ ...merchant, industry: "Beauté" }));
  assert.equal(normalized.templateId, "classic-wheel");
  assert.equal(normalized.headline, "Mon texte conservé");
  assert.equal(normalized.logoText, "Mon logo");
});
