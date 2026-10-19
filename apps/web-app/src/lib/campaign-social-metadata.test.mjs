import assert from "node:assert/strict";
import { test } from "node:test";
import { getCampaignSocialMetadata } from "./campaign-social-metadata.ts";

function campaign({ gameType = "wheel", merchantName = " Institut Démo ", subtitle = " Tournez la roue ! ", wheelSubtitle = "Des cadeaux à gagner", scratchSubtitle = "Grattez votre surprise" } = {}) {
  return {
    merchantName,
    subtitle,
    gameType,
    presentation: { layout: { wheelSubtitle, scratchSubtitle } },
  };
}

test("associe l'établissement et le texte principal, avec le sous-titre de roue en description", () => {
  assert.deepEqual(getCampaignSocialMetadata(campaign(), "Okado", "Description Okado"), {
    title: "Institut Démo — Tournez la roue !",
    description: "Des cadeaux à gagner",
  });
});

test("les tickets à gratter utilisent leur sous-titre propre", () => {
  assert.deepEqual(
    getCampaignSocialMetadata(campaign({ gameType: "scratch" }), "Okado", "Description Okado"),
    {
      title: "Institut Démo — Tournez la roue !",
      description: "Grattez votre surprise",
    },
  );
});

test("les textes absents utilisent les replis sans séparateur ou description vide", () => {
  assert.deepEqual(
    getCampaignSocialMetadata(
      campaign({ merchantName: " ", subtitle: " ", wheelSubtitle: " " }),
      "Okado",
      "Description Okado",
    ),
    { title: "Okado", description: "Description Okado" },
  );
});

test("un texte principal absent conserve le nom de l'établissement", () => {
  assert.deepEqual(
    getCampaignSocialMetadata(campaign({ subtitle: " " }), "Okado", "Description Okado"),
    { title: "Institut Démo", description: "Des cadeaux à gagner" },
  );
});
