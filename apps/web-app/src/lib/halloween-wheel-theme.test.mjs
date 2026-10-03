import assert from "node:assert/strict";
import test from "node:test";
import { halloweenWheelVisualSegments } from "./halloween-wheel-theme.ts";
import { buildWheelVisualSegments } from "./wheel-segments.ts";

test("six secteurs conservent le lot de 50% et le résultat réel, sans mutation", () => {
  const source = buildWheelVisualSegments([
    { id: "ten", label: "-10% PROCHAINE VISITE", probability: 50 },
  ]);
  const before = JSON.stringify(source);
  for (const winner of source) {
    const visible = halloweenWheelVisualSegments(source, winner.id);
    assert.equal(visible.length, 6);
    assert.ok(visible.some((segment) => segment.id === winner.id));
    assert.ok(
      visible.some(
        (segment) =>
          segment.id === "ten" || segment.id.startsWith("ten-visual-"),
      ),
    );
    assert.ok(visible.some((segment) => segment.tone === "lose"));
  }
  assert.equal(JSON.stringify(source), before);
});

test("tous les lots distincts restent représentés, même au-delà des six secteurs cibles", () => {
  for (let count = 1; count <= 50; count++) {
    const prizes = Array.from({ length: count }, (_, index) => ({
      id: `reward-${index}`,
      label: `Lot ${index}`,
      probability: 100 / count,
    }));
    const source = buildWheelVisualSegments(prizes);
    for (const winner of source) {
      const visible = halloweenWheelVisualSegments(source, winner.id);
      assert.equal(visible.length % 2, 0);
      assert.ok(visible.some((segment) => segment.id === winner.id));
      for (const prize of prizes)
        assert.ok(
          visible.some(
            (segment) => segment.id.replace(/-visual-\d+$/, "") === prize.id,
          ),
        );
    }
  }
});

test("une roue vide ne déclenche pas une fabrication de lots", () => {
  assert.deepEqual(halloweenWheelVisualSegments([], "missing"), []);
});
