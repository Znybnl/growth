import assert from "node:assert/strict";
import test from "node:test";

import { calculatePrizeConsumption } from "./dashboard-metrics.ts";

test("calcule un taux pondéré sur le stock initial quantifié", () => {
  assert.deepEqual(
    calculatePrizeConsumption([
      { totalQuantity: 100, remainingQuantity: 65 },
      { totalQuantity: 20, remainingQuantity: 5 },
    ]),
    { initial: 120, consumed: 50, rate: 42 },
  );
});

test("ignore les lots illimités et renvoie un taux absent sans stock quantifié", () => {
  assert.deepEqual(
    calculatePrizeConsumption([
      { totalQuantity: null, remainingQuantity: null },
      { totalQuantity: 0, remainingQuantity: 0 },
    ]),
    { initial: 0, consumed: 0, rate: null },
  );
});

test("borne le stock disponible pour éviter un taux négatif ou supérieur à 100 %", () => {
  assert.deepEqual(
    calculatePrizeConsumption([
      { totalQuantity: 10, remainingQuantity: -2 },
      { totalQuantity: 10, remainingQuantity: 12 },
    ]),
    { initial: 20, consumed: 10, rate: 50 },
  );
});
