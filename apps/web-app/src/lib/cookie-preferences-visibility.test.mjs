import assert from "node:assert/strict";
import test from "node:test";
import { isPublicGamePage } from "./cookie-preferences-visibility.ts";

test("identifie les pages de jeu et leur aperçu intégré, sans masquer les autres pages", () => {
  assert.equal(isPublicGamePage("/campaign/summer-game"), true);
  assert.equal(isPublicGamePage("/campaign/summer-game/preview-embed"), true);
  assert.equal(isPublicGamePage("/campaigns"), false);
  assert.equal(isPublicGamePage("/connexion"), false);
  assert.equal(isPublicGamePage(null), false);
});
