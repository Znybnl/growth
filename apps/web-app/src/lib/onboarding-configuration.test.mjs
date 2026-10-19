import assert from "node:assert/strict";
import test from "node:test";

import {
  ONBOARDING_STEPS,
  shouldShowAppointmentUrl,
  validateOnboardingStep,
} from "./onboarding-configuration.ts";

const validProfileAndPin = {
  companyName: "Maison Sora",
  industry: "Beauté",
  city: "Paris",
  redemptionPin: "0000",
};

test("onboarding separates profile, marketing links, and PIN into three steps", () => {
  assert.deepEqual(ONBOARDING_STEPS.map(({ id }) => id), ["profil", "reseaux", "pin"]);
});

test("appointment URL is only requested for the Beauty sector", () => {
  assert.equal(shouldShowAppointmentUrl("Beauté"), true);
  assert.equal(shouldShowAppointmentUrl("Restauration"), false);
  assert.equal(shouldShowAppointmentUrl("Services"), false);
});

test("requires only the establishment name, industry, city, and valid four-digit PIN", () => {
  assert.equal(validateOnboardingStep("profil", { ...validProfileAndPin, companyName: " " }), "Renseignez le nom de l’enseigne pour continuer.");
  assert.equal(validateOnboardingStep("profil", { ...validProfileAndPin, industry: "" }), "Choisissez un secteur d’activité pour continuer.");
  assert.equal(validateOnboardingStep("profil", { ...validProfileAndPin, city: "" }), "Renseignez la ville du commerce pour continuer.");
  assert.equal(validateOnboardingStep("pin", { ...validProfileAndPin, redemptionPin: "12a4" }), "Le code PIN doit contenir exactement 4 chiffres.");
  assert.equal(validateOnboardingStep("reseaux", { ...validProfileAndPin, redemptionPin: "" }), null);
  assert.equal(validateOnboardingStep("pin", validProfileAndPin), null);
});
