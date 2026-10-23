import assert from "node:assert/strict";
import test from "node:test";
import { buildWheelVisualSegments, selectWheelVisualSegments, rosePowderVisualSegments } from "./wheel-segments.ts";

const prizes = [
  { id: "discount15", label: "-15% PRESTATION", probability: 15 },
  { id: "discount20", label: "-20% PRESTATION", probability: 10 },
  { id: "voucher", label: "5€ offert", probability: 10 },
  { id: "luxo", label: "une séance de luxopuncture", probability: 5 },
  { id: "headspa", label: "un soin headspa INTITION", probability: 5 },
];
const baseId = segment => segment.id.replace(/-visual-\d+$/, "");

test("cas headspa : les cinq lots et la perte sont visibles au repos, sans mutation", () => {
  const source = buildWheelVisualSegments(prizes);
  assert.equal(source[8].id, "headspa");
  const before = JSON.stringify(source);
  for (const select of [selectWheelVisualSegments, rosePowderVisualSegments]) {
    const visible = select(source, "absent");
    assert.equal(visible.length, 8);
    for (const prize of prizes) assert.ok(visible.some(segment => segment.id === prize.id));
    assert.ok(visible.some(segment => segment.tone === "lose"));
    assert.equal(new Set(visible.map(segment => segment.id)).size, visible.length);
    assert.deepEqual(select(source, "absent"), visible);
  }
  assert.equal(JSON.stringify(source), before);
});

test("chaque résultat exact, y compris une répétition perdante, reste représenté", () => {
  const source = buildWheelVisualSegments(prizes);
  for (const result of source) {
    const visible = selectWheelVisualSegments(source, result.id);
    assert.ok(visible.some(segment => segment.id === result.id));
    for (const prize of prizes) assert.ok(visible.some(segment => baseId(segment) === prize.id));
    assert.equal(new Set(visible.map(segment => segment.id)).size, visible.length);
  }
});

test("1 à 50 lots distincts, même libellé : aucun masquage, avec ou sans perte", () => {
  for (let count = 1; count <= 50; count++) for (const total of [50, 100]) {
    const source = buildWheelVisualSegments(Array.from({ length: count }, (_, index) => ({
      id: `reward-${index}`, label: "Même libellé", probability: total / count,
    })));
    for (const result of source) {
      const visible = selectWheelVisualSegments(source, result.id);
      assert.ok(visible.some(segment => segment.id === result.id));
      assert.equal(new Set(visible.map(baseId)).size, new Set(source.map(baseId)).size);
      assert.equal(new Set(visible.map(segment => segment.id)).size, visible.length);
      assert.ok(visible.every(segment => source.includes(segment)));
    }
  }
});

test("vide et probabilités nulles, négatives ou invalides ne créent pas de lot", () => {
  assert.deepEqual(selectWheelVisualSegments([], "none"), []);
  const source = buildWheelVisualSegments([
    { id: "zero", label: "Zéro", probability: 0 },
    { id: "negative", label: "Négatif", probability: -1 },
    { id: "invalid", label: "Invalide", probability: NaN },
  ]);
  assert.ok(selectWheelVisualSegments(source, "none").every(segment => segment.tone === "lose"));
});
