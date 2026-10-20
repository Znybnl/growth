# Contrôle avant recette — SFD Lots, phases 1–2 (#609 / PR #610)

## Conclusion et périmètre

Les six livrables de phase 1 et les cinq livrables de phase 2 du chapitre 21
sont présents. Ce constat porte sur ces deux phases, pas sur l’intégralité de
la SFD. Les adaptations demandées ensuite par le propriétaire priment sur le
document initial : édition directe des chances et validation locale d’un lot
possible malgré un total provisoire supérieur à 100 %.

## Traçabilité

| Référence SFD | Contrôle | Résultat |
| --- | --- | --- |
| §4–5 | Titre, actions idées/création disponibles | Présents, sans titre répété |
| §6, §8.3 | Jauge, part perdante, cas 0/100/>100 | Recalcul immédiat ; PERDU informatif, jamais envoyé comme lot |
| §8 | Tableau, actions, confirmation, indépendance des copies | Vérifiés, chances éditables sans panneau |
| §9–10 | Fenêtre 800–900 px, cartes 2/1 colonnes, catalogue existant | 864 px sur bureau, plein écran mobile, défilement du contenu |
| §10.3–10.5 | Ajouts successifs, champs préremplis, état Ajouté, doublons | Vérifiés, dont double-clic et suppression/réajout |
| §13 | Panneau droite/mobile, nom, champs, achat/conditions, abandon | Vérifiés ; compteur fondé sur la limite existante de 120 caractères |
| §14 | Dépassement et absence de rééquilibrage silencieux | Alerte avant clic ; ajustement explicite ou validation locale selon le choix propriétaire |
| §15 | Règles globales accessibles après les lots | Regroupement anticipé de la phase 5 ; valeurs conservées |
| §19 | 1280×720/600 et mobile 320/390 | Captures de catalogues et compositions denses inspectées |
| §20, §22 | Stocks, données, validation serveur, brouillons | Nouveaux stocks et copies corrigés ; publication à 0 % refusée ; brouillons incomplets conservés |

## Défauts corrigés pendant le contrôle

1. **Lot créé dans un jeu existant** : le panneau écrivait seulement le stock
   restant. Il initialise désormais stock initial et stock restant du nouveau
   lot. Un nouveau lot limité à zéro est refusé ; l’édition du stock disponible
   d’un lot existant épuisé reste possible.
2. **Duplication** : une nouvelle copie repart avec son propre stock de départ,
   sans recopier le stock déjà consommé de la source. Le test vérifie source
   initiale 12/restant 4, copie initiale 12/restant 12 et identifiants distincts.
3. **Zéro chance gagnante** : le chapitre 6.3 exige au moins un lot avec une
   probabilité positive. L’interface et les deux validations serveur refusent
   maintenant cette publication. Les brouillons à zéro restent sauvegardables.
4. **Rendu** : compteur de caractères et astérisques corrigés ; libellés longs
   consultables ; icône informative PERDU ; marge de défilement des lignes pour
   garder le lot ciblé visible sous la barre d’actions mobile ; alignement des
   champs Chance/Stock à 320 px.

## Écarts restant aux phases suivantes

- **Coûts — §7 et §13.2, phase 5** : le formulaire manuel reprend encore le
  coût par défaut existant. Le champ initialement vide et la distinction
  persistante « coût inconnu » / « coût nul » ne sont pas encore réalisés.
  Ne pas présenter ce point comme conforme à toute la SFD ; il accompagne la
  future synthèse du budget et le traitement des coûts manquants.
- **Mes lots et Compositions — §9.3, §11–12** : leurs onglets et fonctionnalités
  appartiennent aux phases 3 et 4. La bibliothèque présente actuellement les
  Suggestions, sans onglets inactifs simulant des fonctions disponibles.
- Le stock illimité utilise encore la convention existante « champ vide » ;
  le stock limité utilise une quantité numérique, avec aide explicite.
- Le nom et l’action Modifier ouvrent l’éditeur. Les autres cellules ne
  déclenchent pas cette ouverture, pour préserver l’édition directe demandée.

## Preuves et recette

`wizard-prize-audit.spec.ts` capture un catalogue de dix suggestions et une
composition de onze lots à libellés longs, ainsi que les états erreur et vide.
Les contrôles portent sur les débordements internes, l’alignement, les actions
visibles, le nom du lot dégagé sous la barre fixe et le compteur. Les captures
ont été ouvertes et inspectées, au-delà des seules assertions.

La matrice composition/bibliothèque/responsive/audit comporte 24 tests
navigateur. `test:marketing-action-library` inclut le refus d’une publication à
0 % dans `parseCampaignSetupInput` et `assertCampaignCanPublish`, ainsi que
l’acceptation d’un brouillon incomplet et d’une probabilité positive décimale.
Lint et build complètent les vérifications.

Tous les essais utilisent des fixtures, des API interceptées ou des fonctions
isolées. Aucune écriture métier en production, migration ou modification
automatique des jeux enregistrés.
