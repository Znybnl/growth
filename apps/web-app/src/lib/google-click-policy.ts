export const GOOGLE_CLICK_WARNING_VERSION = "2026-10-23-v1";
export const GOOGLE_CLICK_WARNING_TEXT = "Rendre obligatoire le clic sur « Écrire un avis » avant de jouer peut contrevenir aux règles de Google et exposer la fiche de votre établissement à des restrictions. Seul le clic est requis : le participant n’a aucune obligation de publier un avis. Okado ne vérifie ni la publication ni le contenu d’un avis.";

export function requiresGoogleClick(required: boolean | undefined, actionKind: string | undefined) {
  return required === true && actionKind === "google";
}
