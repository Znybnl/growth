export const GOOGLE_CLICK_WARNING_VERSION = "2026-10-23-v2";
export const GOOGLE_CLICK_WARNING_TEXT = "Rendre obligatoire le clic sur « Écrire un avis » avant de jouer peut contrevenir aux règles de Google. Seul le clic est requis : le participant n’a aucune obligation de publier un avis. Okado ne peut vérifier ni la publication ni le contenu d’un avis.";

export function requiresGoogleClick(required: boolean | undefined, actionKind: string | undefined) {
  return required === true && actionKind === "google";
}
