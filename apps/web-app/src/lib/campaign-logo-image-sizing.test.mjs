import assert from "node:assert/strict";
import test from "node:test";
import { parseCampaignSetupInput } from "./merchant-input.ts";

const parse = (logo) => parseCampaignSetupInput({
  gameType: "wheel",
  rewardRules: {},
  accent: {},
  presentation: {
    logo,
    background: {},
    heading: {},
    button: {},
    wheel: {},
    poster: { wheel: {} },
    email: {},
    layout: {},
  },
}, "fixture-merchant");

test("legacy campaigns keep intrinsic logo image sizing when no mode was persisted", () => {
  assert.equal(parse({ sizePercent: 100 }).presentation.logo.imageSizingMode, "legacy");
});

test("new logo sizing mode survives campaign input normalization", () => {
  assert.equal(parse({ sizePercent: 100, imageSizingMode: "height-150" }).presentation.logo.imageSizingMode, "height-150");
});
