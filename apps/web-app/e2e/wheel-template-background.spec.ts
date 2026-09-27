import { expect, test } from "@playwright/test";

import {
  DEFAULT_COCORICO_DUO_YELLOW,
  DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR,
  wheelBackgroundForTemplate,
  wheelBackgroundForTemplateSelection,
} from "../src/lib/campaign-defaults";

test("Classique ne reprend pas le fond jaune de Bicolore à sa première sélection", () => {
  expect(wheelBackgroundForTemplateSelection("classic", DEFAULT_COCORICO_DUO_YELLOW)).toBe("#ffffff");
  expect(wheelBackgroundForTemplateSelection("classic", "#2563eb")).toBe("#ffffff");
});

test("Éclat initialise son fond rose après un template sombre", () => {
  expect(wheelBackgroundForTemplateSelection("rose-institut", "#171126")).toBe(
    DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR,
  );
  expect(wheelBackgroundForTemplateSelection("rose-institut", "#24183a")).toBe(
    DEFAULT_ROSE_INSTITUT_BACKGROUND_COLOR,
  );
});

test("les fonds personnalisés enregistrés restent inchangés au chargement", () => {
  expect(wheelBackgroundForTemplate("classic", DEFAULT_COCORICO_DUO_YELLOW)).toBe(DEFAULT_COCORICO_DUO_YELLOW);
  expect(wheelBackgroundForTemplate("classic", "#aabbcc")).toBe("#aabbcc");
  expect(wheelBackgroundForTemplateSelection("cocorico-duo-wheel", "#ffffff")).toBe(DEFAULT_COCORICO_DUO_YELLOW);
});
