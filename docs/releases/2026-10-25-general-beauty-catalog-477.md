# Toutes les suggestions Beauté pour le généraliste — #477

## Résultat

Un établissement explicitement classé Beauté généraliste / multi-activité
accède aux six bibliothèques Beauté, plus les suggestions générales non classées
déjà disponibles. Filtrage commun repository/API, partagé par Wizard et éditeur
classique, roue et ticket. Aucune liste de lots ou limite de 61 en code.

Le contrôle distant en lecture seule du 25 octobre retourne 70 suggestions
Beauté actives : 7 généralistes, 12 Coiffure, 14 Ongles, 13 Regard, 12 Massage &
Spa, 12 Soins visage & corps. L’issue citait les 61 standards initiaux ; les
ajouts depuis lors sont inclus automatiquement. Aucun catalogue modifié par
ce contrôle ; seules les catégories et leurs compteurs sont conservés ici.

## Implémentation et non-régressions

Deux lectures parallèles : les six sous-secteurs actuels (avec l’alias Spa
historique déjà reconnu) et le groupe non classé. Union par identifiant et tri
existant conservés. Les homonymes restent distincts, les suggestions inactives
restent exclues du parcours marchand. Aucun coût, condition ou probabilité
recalculé. Les copies continuent d’utiliser `prizeFieldsFromSuggestion`.

L’absence de sous-secteur, les anciennes catégories et le repli d’une spécialité
sans catalogue ne sont pas assimilés à un choix explicite généraliste. Les
spécialités et les autres secteurs restent filtrés comme avant. Les recettes
de compositions gardent leur sélection métier explicite ; pas de composition
automatique avec un lot d’un autre sous-secteur devenu visible.

Aucun profil, suggestion personnalisée, jeu, gain, stock, permission, RLS,
e-mail ou consentement modifié. Authentification, lecture privée/no-store et
protection contre les réponses périmées de l’autre contexte conservées.
Aucune migration SQL, dépendance ou nouveau service.

## Vérifications

- `npm run test:beauty-catalog -w @okado/web-app` : 27/27, dont repository/API,
  union, duplications/homonymes, alias, conservation et migrations historiques
  exécutées dans PostgreSQL isolé (pas en production).
- `npm run test:prize-compositions -w @okado/web-app` : 31/31.
- `npm run lint:web` : sans erreur, quatre avertissements antérieurs hors
  périmètre. `npm run build:web` (TypeScript compris) : réussi.
- `general-beauty-catalog.spec.ts` : suite navigateur dédiée aux composants
  actuels, données fictives, API interceptées et POST refusés. La fixture de
  développement permet de choisir roue/ticket, sans accès serveur privilégié.
  Dernier passage : 6/6 réussis, captures1280×600 et390px inspectées. Premiers
  passages corrigés pour cibler les commandes/libellés accessibles actuels du
  Wizard (aucune assertion fonctionnelle retirée). ESLint ciblé et
  `npm run verify:source` réussis.

## Recette et livraison

Choisir un établissement généraliste, ouvrir les idées de lots dans le Wizard,
vérifier la présence des cinq spécialités puis ajouter un lot et personnaliser
ses conditions. Vérifier que les lots déjà configurés sont intacts ; rouvrir
une spécialité et confirmer que sa bibliothèque reste ciblée. Même contrôle
dans l’éditeur classique. Aucun changement du profil n’est nécessaire pour
accéder aux spécialités dans un établissement déjà généraliste.

PR dédiée depuis main ; validation propriétaire avant merge/déploiement.
Retour arrière applicatif uniquement ; aucune donnée ou migration à restaurer.
