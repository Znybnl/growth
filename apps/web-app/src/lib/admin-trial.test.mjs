import assert from "node:assert/strict";
import test from "node:test";

import {
  canExtendMerchantTrial,
  getAdminSubscriptionDisplay,
  getTrialExtensionDate,
  MAX_TRIAL_EXTENSION_DAYS,
} from "./admin-trial.ts";

const NOW = Date.parse("2026-09-30T12:00:00.000Z");
const ACTIVE_TRIAL_END = "2026-10-10T12:00:00.000Z";

test("affiche les jours restants d’un essai sans statut Stripe", () => {
  assert.deepEqual(getAdminSubscriptionDisplay(null, ACTIVE_TRIAL_END, false, null, NOW), {
    label: "Essai (10 jours restants)",
    tone: "info",
  });
  assert.deepEqual(getAdminSubscriptionDisplay(null, "2026-10-01T12:00:00.000Z", false, null, NOW), {
    label: "Essai (1 jour restant)",
    tone: "info",
  });
  assert.deepEqual(getAdminSubscriptionDisplay(null, "2026-09-30T12:30:00.000Z", false, null, NOW), {
    label: "Essai (moins d’un jour restant)",
    tone: "info",
  });
  assert.deepEqual(getAdminSubscriptionDisplay(null, "2026-09-29T12:00:00.000Z", false, null, NOW), {
    label: "Inactif",
    tone: "muted",
  });
  assert.deepEqual(getAdminSubscriptionDisplay("trialing", "2026-09-29T12:00:00.000Z", false, null, NOW), {
    label: "Inactif",
    tone: "muted",
  });
});

test("privilégie une période d’essai encore valide aux statuts Stripe périmés ou non actifs", () => {
  for (const status of ["incomplete", "incomplete_expired", "canceled", "paused"]) {
    const display = getAdminSubscriptionDisplay(status, ACTIVE_TRIAL_END, false, null, NOW);
    assert.match(display.label, /^Essai \(10 jours restants\)/, status ?? "null");
  }

  assert.deepEqual(
    getAdminSubscriptionDisplay("past_due", ACTIVE_TRIAL_END, false, null, NOW),
    { label: "Essai (10 jours restants) · paiement à suivre", tone: "warning" },
  );
  assert.deepEqual(
    getAdminSubscriptionDisplay("trialing", ACTIVE_TRIAL_END, true, null, NOW),
    { label: "Essai (10 jours restants) · résiliation le 10 oct. 2026", tone: "warning" },
  );
  assert.deepEqual(
    getAdminSubscriptionDisplay("active", ACTIVE_TRIAL_END, false, null, NOW),
    { label: "Actif", tone: "active" },
  );
});

test("rend prolongeable un essai sans abonnement Stripe, même expiré, et refuse les abonnements Stripe non admissibles", () => {
  assert.equal(canExtendMerchantTrial("trialing", ACTIVE_TRIAL_END, false, "sub_test", NOW), true);
  assert.equal(canExtendMerchantTrial(null, ACTIVE_TRIAL_END, false, null, NOW), true);
  assert.equal(canExtendMerchantTrial("trialing", ACTIVE_TRIAL_END, false, null, NOW), false);
  assert.equal(canExtendMerchantTrial(null, "2026-09-29T12:00:00.000Z", false, null, NOW), true);
  assert.equal(canExtendMerchantTrial("canceled", ACTIVE_TRIAL_END, false, "sub_test", NOW), false);
  assert.equal(canExtendMerchantTrial("trialing", ACTIVE_TRIAL_END, true, "sub_test", NOW), false);
  assert.equal(canExtendMerchantTrial(null, null, false, null, NOW), false);
});

test("calcule l’échéance depuis la fin actuelle ou aujourd’hui et borne la durée", () => {
  assert.equal(
    getTrialExtensionDate(ACTIVE_TRIAL_END, 5, NOW),
    "2026-10-15T12:00:00.000Z",
  );
  assert.equal(
    getTrialExtensionDate("2026-09-29T12:00:00.000Z", 5, NOW),
    "2026-10-05T12:00:00.000Z",
  );
  assert.throws(() => getTrialExtensionDate(ACTIVE_TRIAL_END, MAX_TRIAL_EXTENSION_DAYS + 1, NOW));
});
