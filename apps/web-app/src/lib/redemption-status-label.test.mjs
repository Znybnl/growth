import assert from "node:assert/strict";
import test from "node:test";

import { redeemedStatusLabel } from "./redemption-status-label.ts";

test("shows the recorded redemption date and time", () => {
  const redeemedAt = "2026-09-29T14:07:00.000Z";
  const date = new Date(redeemedAt);
  const expectedDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
  const expectedTime = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(date);

  assert.equal(redeemedStatusLabel(redeemedAt), `Lot déjà retiré le ${expectedDate} à ${expectedTime}`);
});

test("uses a safe fallback when the redemption timestamp is missing or invalid", () => {
  assert.equal(redeemedStatusLabel(), "Lot déjà retiré");
  assert.equal(redeemedStatusLabel("not-a-date"), "Lot déjà retiré");
});
