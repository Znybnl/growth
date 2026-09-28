import assert from "node:assert/strict";
import test from "node:test";

import { calculateCampaignConsumptionMetrics } from "./dashboard-metrics.ts";

test("calcule la consommation sur les gains effectivement retirés", () => {
  assert.deepEqual(
    calculateCampaignConsumptionMetrics(120, 50),
    { lotsUsed: 50, consumptionRate: 42 },
  );
});

test("inclut les lots à stock illimité dans les gains et les retraits", () => {
  assert.deepEqual(
    calculateCampaignConsumptionMetrics(4, 2),
    { lotsUsed: 2, consumptionRate: 50 },
  );
});

test("affiche un taux de 0 % lorsqu'aucun lot n'a été gagné", () => {
  assert.deepEqual(calculateCampaignConsumptionMetrics(0, 0), { lotsUsed: 0, consumptionRate: 0 });
});
