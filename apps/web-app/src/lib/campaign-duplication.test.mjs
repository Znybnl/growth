import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDuplicatedPrizeInput } from "./campaign-duplication.ts";

test("la copie d’un lot reprend ses conditions et garde l’achat requis indépendant", () => {
  const source = {
    id: "source-prize",
    campaignId: "source-game",
    label: "-10 %",
    totalQuantity: 40,
    remainingQuantity: 9,
    probability: 25,
    estimatedUnitCost: 2.5,
    estimatedUnitCostKnown: false,
    purchaseRequired: true,
    usageConditions: "Valable sur la prochaine visite, hors soldes.",
  };

  assert.deepEqual(buildDuplicatedPrizeInput(source, "copied-prize"), {
    id: "copied-prize",
    label: "-10 %",
    totalQuantity: 40,
    probability: 25,
    estimatedUnitCost: 2.5,
    estimatedUnitCostKnown: false,
    purchaseRequired: true,
    usageConditions: "Valable sur la prochaine visite, hors soldes.",
  });
});

test("la copie préserve aussi une condition vide sans reprendre l’identifiant ni le stock courant", () => {
  const source = {
    id: "source-prize",
    campaignId: "source-game",
    label: "Café offert",
    totalQuantity: 12,
    remainingQuantity: 3,
    probability: 10,
    estimatedUnitCost: 1,
    purchaseRequired: false,
    usageConditions: "",
  };

  const copy = buildDuplicatedPrizeInput(source, "copied-prize");

  assert.equal(copy.id, "copied-prize");
  assert.equal(copy.usageConditions, "");
  assert.equal(copy.purchaseRequired, false);
  assert.equal("campaignId" in copy, false);
  assert.equal("remainingQuantity" in copy, false);
});
