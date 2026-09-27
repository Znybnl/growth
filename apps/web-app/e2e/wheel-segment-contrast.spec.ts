import { expect, test } from "@playwright/test";
import { contrastRatio, legibleSegmentTextColor } from "../src/lib/color-contrast";

test("les libellés restent lisibles sur les couleurs claires, foncées et intermédiaires", () => {
  for (const background of ["#ffffff", "#0b4ea2", "#8f9997", "#b99052", "#f3cdd5", "#ff4f87", "#171126"]) {
    for (const preferred of ["#ffffff", "#111827", background]) {
      const rendered = legibleSegmentTextColor(background, preferred);
      expect(contrastRatio(background, rendered), `${background} / ${preferred}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test("une couleur personnalisée suffisamment contrastée reste intacte", () => {
  expect(legibleSegmentTextColor("#fffdfc", "#0b4ea2")).toBe("#0b4ea2");
  expect(legibleSegmentTextColor("#17243d", "#ffffff")).toBe("#ffffff");
});

test("une couleur de texte identique au segment est remplacée", () => {
  expect(legibleSegmentTextColor("#0b4ea2", "#0b4ea2")).not.toBe("#0b4ea2");
  expect(legibleSegmentTextColor("#ffffff", "#ffffff")).not.toBe("#ffffff");
});
