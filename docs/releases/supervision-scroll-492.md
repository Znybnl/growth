# Supervision : défilement vertical unique — #492

## Cause et correctif

Les légendes `caption.sr-only`, positionnées absolument pour les lecteurs
d’écran, avaient le document comme contenant. Dans le cadre marchand à hauteur
fixe, elles échappaient au défilement du `main` et allongeaient également le
document. Reproduction à 1280 × 720 : document de 2342 px en plus du `main`
scrollable. Le positionnement relatif du conteneur partagé `SupportTable`
attache chaque légende à son tableau : document de 720 px, une seule zone de
défilement vertical. Aucune barre n’est masquée par une nouvelle règle CSS.

## Périmètre et validation

- Une seule classe de positionnement ajoutée au conteneur des tableaux.
- Fixture de développement enrichie avec le vrai `MerchantShell`, données
  fictives et bloc de fin de page ; toujours inaccessible en production.
- `support-scroll.spec.ts` : 320/390/1280 px et 1536 × 540 px ; document sans
  débordement, `main` seul conteneur vertical, captions présentes et contenues,
  défilement horizontal au clavier, erreur dépliée et bas de page accessibles.
- Rejouer les suites Supervision existantes, le lint et le build web.

Les règles métier, permissions, sources de données, filtres, pagination et
actions restent identiques. Aucune migration, mutation de gain ni notification.
Recette propriétaire : ouvrir Supervision, défiler jusqu’au Journal et au bloc
Brevo ; vérifier une seule barre verticale, puis les colonnes sur petit écran.
Production uniquement après accord explicite ; retour arrière par revert de la PR.

## Preuves locales

- Nouveau test retirant temporairement le positionnement relatif : échec attendu
  à 1280 × 720 (document débordant et captions non contenues). Après restauration,
  les quatre résolutions passent : le test détecte bien la régression d’origine.
- 15 tests navigateur réussis (4 défilement + 11 Supervision existants).
- 15 tests serveur/SQL `test:support-incidents` réussis, sans accès à une base réelle.
- `lint:web` : aucune erreur, quatre avertissements préexistants hors périmètre.
- `build:web`, `verify:source` et `git diff --check` réussis.
- Captures de fin de page inspectées à 320 × 720 et 1536 × 540.
- Smoke HTTP du build production : fixture `/dev/support-monitoring?shell=1`
  refusée (404), Supervision sans session redirigée vers `/connexion` (307).
