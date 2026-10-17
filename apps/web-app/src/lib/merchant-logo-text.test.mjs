import assert from "node:assert/strict";
import test from "node:test";

import { defaultMerchantLogoText, resolveMerchantLogoText } from "./merchant-logo-text.ts";

test("uses the complete merchant name as the default text logo", () => {
  assert.equal(defaultMerchantLogoText("L'Institut de Beauté"), "L'Institut de Beauté");
  assert.equal(defaultMerchantLogoText("Le Comptoir des Îles"), "Le Comptoir des Îles");
});

test("trims only surrounding whitespace without changing the merchant name", () => {
  assert.equal(defaultMerchantLogoText("  Maison Sora  "), "Maison Sora");
});

test("replaces a previously generated two-letter default with the full merchant name", () => {
  assert.equal(resolveMerchantLogoText("Maison Sora", "MA"), "Maison Sora");
  assert.equal(resolveMerchantLogoText("  Le Comptoir des Îles ", "LE"), "Le Comptoir des Îles");
});

test("preserves a custom logo text instead of replacing it with the merchant name", () => {
  assert.equal(resolveMerchantLogoText("Maison Sora", "Maison Sora Studio"), "Maison Sora Studio");
});
