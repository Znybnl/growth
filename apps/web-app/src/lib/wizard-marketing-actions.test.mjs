import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminWizardMarketingActionDefaults,
  createWizardMarketingActionDefaults,
} from "./wizard-marketing-actions.mjs";

const emptyMerchant = {};

test("does not create the default Google action when no Google listing URL is configured", () => {
  assert.deepEqual(createWizardMarketingActionDefaults(emptyMerchant, "review_prompt"), []);
  assert.deepEqual(createWizardMarketingActionDefaults(emptyMerchant, "lead_capture"), []);
});

test("uses only configured, valid URLs while preserving the review prompt order and limit", () => {
  const merchant = {
    googleReviewUrl: "https://g.page/my-beauty-studio",
    instagramUrl: "instagram.com/my-beauty-studio",
    facebookUrl: "http://facebook.com/my-beauty-studio",
    tiktokUrl: "https://www.tiktok.com/@my-beauty-studio",
  };

  assert.deepEqual(
    createWizardMarketingActionDefaults(merchant, "review_prompt"),
    [
      {
        id: "wizard-google-action",
        kind: "google",
        url: "https://g.page/my-beauty-studio",
      },
      {
        id: "wizard-additional-action-2",
        kind: "instagram",
        url: "https://instagram.com/my-beauty-studio",
      },
      {
        id: "wizard-additional-action-4",
        kind: "tiktok",
        url: "https://www.tiktok.com/@my-beauty-studio",
      },
    ],
  );
});

test("social-follow and lead-capture goals omit every action without a configured URL", () => {
  const merchant = {
    instagramUrl: "https://instagram.com/my-beauty-studio",
    customLinkUrl: "https://example.com/booking",
  };

  assert.deepEqual(
    createWizardMarketingActionDefaults(merchant, "social_follow"),
    [{
      id: "wizard-instagram-action",
      kind: "instagram",
      url: "https://instagram.com/my-beauty-studio",
    }],
  );
  assert.deepEqual(
    createWizardMarketingActionDefaults(merchant, "lead_capture"),
    [
      {
        id: "wizard-instagram-action",
        kind: "instagram",
        url: "https://instagram.com/my-beauty-studio",
      },
      {
        id: "wizard-custom-action",
        kind: "custom",
        url: "https://example.com/booking",
      },
    ],
  );
});

test("admin wizard defaults also omit missing and invalid URLs", () => {
  assert.deepEqual(
    createAdminWizardMarketingActionDefaults({
      googleReviewUrl: "https://example.com/not-google",
      instagramUrl: "https://instagram.com/my-beauty-studio",
      appointmentUrl: "https://booking.example.com/studio",
    }),
    [
      {
        id: "admin-wizard-action-1",
        kind: "instagram",
        url: "https://instagram.com/my-beauty-studio",
        label: undefined,
      },
      {
        id: "admin-wizard-action-2",
        kind: "custom",
        url: "https://booking.example.com/studio",
        label: "Prendre rendez-vous",
      },
    ],
  );
});
