import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeSupportLogPayload } from "./support-log-sanitize.ts";

test("support logs remove personal contact details and redemption credentials", () => {
  const payload = sanitizeSupportLogPayload({
    merchantId: "merchant-test",
    email: "camille@example.test",
    redemptionCode: "OK-4A2B91EF",
    pin: "1234",
    forceReason: "Accord exceptionnel de Camille.",
    leadId: "lead-linked-to-camille",
    merchantUserId: "operator-user-id",
    error: "Échec pour camille@example.test avec le code OK-4A2B91EF et le PIN 1234.",
    detail: {
      recipient_email: "camille@example.test",
      redemption_code: "OK-4A2B91EF",
      status: "redeemed",
    },
  });

  assert.deepEqual(payload, {
    merchantId: "merchant-test",
    error: "Échec pour [adresse e-mail masquée] avec le code [code de retrait masqué] et le PIN [masqué].",
    detail: { status: "redeemed" },
  });
  assert.doesNotMatch(JSON.stringify(payload), /camille@example\.test|OK-4A2B91EF|1234/);
});

test("support log sanitizer handles absent and nested payloads", () => {
  assert.equal(sanitizeSupportLogPayload(undefined), undefined);
  assert.deepEqual(sanitizeSupportLogPayload({ metadata: { redemptionCode: "SORA-AB12CD34", contactPhoneNumber: "+33123456789" } }), {
    metadata: {},
  });
});
