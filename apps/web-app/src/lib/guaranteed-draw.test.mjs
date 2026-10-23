import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { selectGuaranteedPrize, NO_GUARANTEED_PRIZE_MESSAGE } from "./guaranteed-draw.ts";

const prize = (id, probability, remainingQuantity = null) => ({ id, probability, remainingQuantity });
test("0 % exclu, poids fractionnaires exacts et bornes strictes", () => {
  const prizes = [prize("zero", 0), prize("small", .25), prize("large", .75), prize("empty", 99, 0)];
  const before = JSON.stringify(prizes);
  assert.equal(selectGuaranteedPrize(prizes, () => 0).id, "small");
  assert.equal(selectGuaranteedPrize(prizes, () => .249999999).id, "small");
  assert.equal(selectGuaranteedPrize(prizes, () => .25).id, "large");
  assert.equal(selectGuaranteedPrize(prizes, () => 1 - Number.EPSILON).id, "large");
  assert.equal(JSON.stringify(prizes), before);
});
test("stocks disponibles : redistribution proportionnelle sans réécrire les chances", () => {
  const prizes = [prize("a", 50, 0), prize("b", 30, 1), prize("c", 20)];
  assert.equal(selectGuaranteedPrize(prizes, () => .599999).id, "b");
  assert.equal(selectGuaranteedPrize(prizes, () => .6).id, "c");
  assert.equal(prizes[1].remainingQuantity, 1);
  assert.deepEqual(prizes.map(p => p.probability), [50, 30, 20]);
});
test("aucun lot éligible : refus plutôt qu'une perte ou un gain à 0 %", () => {
  for (const prizes of [[], [prize("zero", 0)], [prize("empty", 100, 0)], [prize("invalid", NaN)]]) {
    assert.throws(() => selectGuaranteedPrize(prizes), { message: NO_GUARANTEED_PRIZE_MESSAGE });
  }
  for (const roll of [-1, 1, NaN, Infinity]) assert.throws(() => selectGuaranteedPrize([prize("p", 100)], () => roll));
});
test("tirage mémoire branché avant création de session ; prévisualisation inchangée", () => {
  const source = readFileSync(new URL("./store.ts", import.meta.url), "utf8");
  const choose = source.slice(source.indexOf("function choosePrize("), source.indexOf("function expireDrawSessionsFromMemory("));
  assert.match(choose, /isWinningEveryTime[\s\S]*selectGuaranteedPrize\(prizes\)[\s\S]*decrementPrize\(prize\)/);
  const session = source.slice(source.indexOf("function createDrawSessionFromMemory("), source.indexOf("function choosePreviewPrize("));
  assert.ok(session.indexOf("choosePrize(") < session.indexOf("store.drawSessions.push"));
  assert.match(source, /const prize = choosePreviewPrize\(performance.prizes\)/);
});
