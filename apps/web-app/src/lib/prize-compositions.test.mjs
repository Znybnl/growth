import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPrizeCompositions, copyPrizeComposition } from "./prize-compositions.ts";

const suggestion = (id, cost, extra = {}) => ({ id, label: `LOT ${id}`, description: "Avec un soin payant.", industry: "Beauté", icon: "gift", probability: 10, estimatedUnitCost: cost, isActive: true, sortOrder: 0, ...extra });
const catalog = [suggestion("a", 2), suggestion("b", 5), suggestion("c", 10), suggestion("d", 20)];

test("trois profils sectoriels, chances exactes, coût pondéré et coût croissant", () => {
  const before = JSON.stringify(catalog);
  const compositions = buildPrizeCompositions(catalog);
  assert.deepEqual(compositions.map((item) => item.winningProbability), [40, 70, 100]);
  assert.deepEqual(compositions.map((item) => item.prizes.length), [2, 3, 4]);
  assert.deepEqual(compositions.map((item) => item.losingProbability), [60, 30, 0]);
  for (const item of compositions) {
    assert.ok(Math.abs(item.prizes.reduce((sum, prize) => sum + prize.probability, 0) - item.winningProbability) < 1e-8);
    assert.equal(item.averageCost, item.prizes.reduce((sum, prize) => sum + prize.estimatedUnitCost * prize.probability / 100, 0));
    assert.ok(item.prizes.every((prize) => catalog.some((source) => source.id === prize.id)));
  }
  assert.ok(compositions[0].averageCost < compositions[1].averageCost && compositions[1].averageCost < compositions[2].averageCost);
  assert.equal(JSON.stringify(catalog), before);
});

test("catalogue vide, incomplet, inactif ou PERDU : aucun lot inventé", () => {
  assert.deepEqual(buildPrizeCompositions([]), []);
  assert.deepEqual(buildPrizeCompositions([suggestion("bad", NaN), suggestion("inactive", 4, { isActive: false }), suggestion("lost", 0, { label: "PERDU !" })]), []);
  const result = buildPrizeCompositions([suggestion("zero", 0)]);
  assert.equal(result.length, 3);
  assert.ok(result.every((item) => item.prizes.length === 1 && item.averageCost === 0));
});

test("copie entièrement indépendante, conditions/achat conservés, stock neuf et IDs courts", () => {
  const profile = buildPrizeCompositions(catalog)[0];
  const one = copyPrizeComposition(profile, "wizard-prize-test");
  const two = copyPrizeComposition(profile, "wizard-prize-test");
  assert.equal(new Set([...one, ...two].map((prize) => prize.id)).size, one.length + two.length);
  assert.ok(one.every((prize) => prize.id.length <= 120 && prize.totalQuantity === null && prize.remainingQuantity === null));
  assert.equal(one[0].usageConditions, "Avec un soin payant.");
  assert.equal(one[0].purchaseRequired, true);
  one[0].label = "PERSONNALISÉ";
  assert.equal(profile.prizes[0].label, "LOT a");
  assert.equal(two[0].label, "LOT a");
});

test("déduplication des récompenses identiques et catalogue non Beauté sans conditions inventées", () => {
  const result = buildPrizeCompositions([catalog[0], { ...catalog[0], id: "duplicate" }]);
  assert.ok(result.every((item) => item.prizes.length === 1));
  const food = buildPrizeCompositions([suggestion("food", 2, { industry: "Restauration", description: "Café" })]);
  const [copy] = copyPrizeComposition(food[0], "test");
  assert.equal(copy.usageConditions, "");
  assert.equal(copy.purchaseRequired, false);
});
