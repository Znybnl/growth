import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_WHEEL_SUBTITLE, DEFAULT_SCRATCH_SUBTITLE, LEGACY_DEFAULT_WHEEL_SUBTITLE, PREVIOUS_DEFAULT_WHEEL_SUBTITLE, normalizeWheelSubtitle, campaignSubtitleForGameTypeChange } from "./campaign-defaults.ts";

test("new wheels use the new text while saved wheel text retains its existing rendering", () => {
  assert.equal(DEFAULT_WHEEL_SUBTITLE, "Jouez et gagnez");
  assert.equal(normalizeWheelSubtitle(PREVIOUS_DEFAULT_WHEEL_SUBTITLE), PREVIOUS_DEFAULT_WHEEL_SUBTITLE);
  assert.equal(normalizeWheelSubtitle(LEGACY_DEFAULT_WHEEL_SUBTITLE), PREVIOUS_DEFAULT_WHEEL_SUBTITLE);
  assert.equal(normalizeWheelSubtitle("Texte personnalisé"), "Texte personnalisé");
});

test("changing game type preserves custom text and recognizes previous defaults", () => {
  assert.equal(campaignSubtitleForGameTypeChange(DEFAULT_SCRATCH_SUBTITLE, "wheel"), "Jouez et gagnez");
  assert.equal(campaignSubtitleForGameTypeChange(PREVIOUS_DEFAULT_WHEEL_SUBTITLE, "scratch"), DEFAULT_SCRATCH_SUBTITLE);
  assert.equal(campaignSubtitleForGameTypeChange("Texte personnalisé", "scratch"), "Texte personnalisé");
});
