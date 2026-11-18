import assert from "node:assert/strict";
import { test } from "node:test";
import { isBrevoSequenceStepDue } from "./brevo-sequence-policy.ts";

const base = {
  trialStartedAt: "2026-11-01T10:00:00.000Z",
  trialEndsAt: "2026-12-01T10:00:00.000Z",
  subscriptionStatus: "trialing",
  publishedGameCount: 0,
  participationCount: 0,
  timeZone: "Europe/Paris",
  now: new Date("2026-11-03T10:00:00.000Z"),
};

test("no-game reminders run only in the due window and only without a published game", () => {
  assert.equal(isBrevoSequenceStepDue({ ...base, step: "no_game_day_2" }), true);
  assert.equal(isBrevoSequenceStepDue({ ...base, step: "no_game_day_2", now: new Date("2026-11-03T10:06:00.000Z") }), false);
  assert.equal(isBrevoSequenceStepDue({ ...base, step: "no_game_day_2", publishedGameCount: 1 }), false);
});

test("publication reminders require a currently published game and zero persisted participations", () => {
  const input = { ...base, step: "published_no_play_24h", firstPublishedAt: "2026-11-02T10:00:00.000Z", now: new Date("2026-11-03T10:00:00.000Z"), publishedGameCount: 1 };
  assert.equal(isBrevoSequenceStepDue(input), true);
  assert.equal(isBrevoSequenceStepDue({ ...input, participationCount: 1 }), false);
  assert.equal(isBrevoSequenceStepDue({ ...input, publishedGameCount: 0 }), false);
});

test("expiry email is scheduled at 10:00 in the account timezone and stops for active subscriptions", () => {
  const input = { ...base, step: "trial_expiry_1d", trialEndsAt: "2026-12-01T23:00:00.000Z", now: new Date("2026-12-01T09:00:00.000Z") };
  assert.equal(isBrevoSequenceStepDue(input), true);
  assert.equal(isBrevoSequenceStepDue({ ...input, subscriptionStatus: "active" }), false);
});

test("sequence enforces a 24-hour gap and stops after trial expiry", () => {
  assert.equal(isBrevoSequenceStepDue({ ...base, step: "no_game_day_2", previousSequenceEmailAt: "2026-11-03T09:30:00.000Z" }), false);
  assert.equal(isBrevoSequenceStepDue({ ...base, step: "no_game_day_2", now: new Date("2026-12-01T10:00:00.000Z") }), false);
});
