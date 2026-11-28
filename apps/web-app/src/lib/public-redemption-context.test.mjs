import assert from "node:assert/strict";
import test from "node:test";

import { toPublicRedemptionView } from "./public-redemption-context.ts";

test("public redemption view contains display fields only", () => {
  const view = toPublicRedemptionView({
    status: "available",
    leadId: "internal-lead-id",
    campaignId: "internal-campaign-id",
    campaignTitle: "Jeu de test",
    firstName: "Camille",
    maskedEmail: "c•••••@example.test",
    email: "camille@example.test",
    prizeLabel: "Un soin offert",
    prizeUsageConditions: "Sur rendez-vous.",
    redemptionCode: "OK-4A2B91EF",
    rewardAvailableAt: "2026-11-28T09:00:00.000Z",
    rewardExpiresAt: "2026-12-28T09:00:00.000Z",
    purchaseRequired: false,
    redeemedAt: undefined,
    purchaseVerified: false,
    merchantId: "internal-merchant-id",
    merchantName: "Commerce de test",
    merchantCity: "Lyon",
    isPreview: false,
  });

  assert.equal(view.maskedEmail, "c•••••@example.test");
  assert.equal(view.redemptionCode, "OK-4A2B91EF");
  assert.equal(Object.hasOwn(view, "email"), false);
  assert.equal(Object.hasOwn(view, "leadId"), false);
  assert.equal(Object.hasOwn(view, "campaignId"), false);
  assert.equal(Object.hasOwn(view, "merchantId"), false);
  assert.deepEqual(Object.keys(view).sort(), [
    "campaignTitle",
    "firstName",
    "isPreview",
    "maskedEmail",
    "merchantCity",
    "merchantName",
    "prizeLabel",
    "prizeUsageConditions",
    "purchaseRequired",
    "purchaseVerified",
    "redeemedAt",
    "redemptionCode",
    "rewardAvailableAt",
    "rewardExpiresAt",
    "status",
  ]);
});
