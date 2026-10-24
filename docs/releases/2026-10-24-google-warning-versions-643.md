# Correction des acceptations Google v2 — #643

## Incident et cause

Le 24 octobre 2026, des enregistrements de jeu actif ont échoué en HTTP 500.
Le texte de l’avertissement avait évolué vers `2026-10-23-v2`, mais le trigger
`validate_google_click_acceptance_638` n’autorisait encore que v1. L’acceptation
était créée correctement, puis refusée lors de l’enregistrement du jeu.
Les tests SQL utilisaient v1 en dur et la suite Google n’était pas exécutée
dans le Quality gate. Les deux points sont corrigés.

## Correction et données

Appliquer **`supabase/migrations/20261024150000_google_warning_versions_643.sql`**.
La migration remplace uniquement la fonction de validation existante, dans une
transaction. Elle autorise explicitement v1 et v2, et refuse toute autre version.
Elle ne modifie aucune campagne, aucun lot, stock, événement ou preuve
d’acceptation existante. Les dates, textes et versions acceptés restent conservés.
Les acceptations v2 créées pendant l’incident peuvent être réutilisées lors
du prochain enregistrement si elles sont toujours détenues par le formulaire.
Après un rechargement ayant perdu cette référence, accepter à nouveau l’option.

Le marchand, le rattachement à un seul jeu et la nouvelle confirmation à la
réactivation restent contrôlés. RLS, rôles et accès privés restent identiques.
L’ancien code et les jeux ayant une acceptation v1 restent compatibles.

## Vérification avant livraison

- `npm run test:google-click -w @okado/web-app` : API, version courante issue du
  code applicatif, upgrade v1/v2, versions inconnues, absence/étranger/autre jeu,
  réactivation, idempotence de migration, permissions et rollback dans PGlite.
  La vraie RPC `save_campaign_setup` est également exécutée : refus atomique
  avant correction, succès après migration, lots/stocks/chances/actions conservés.
- `npm run lint:web` et `npm run build:web`.
- `npx playwright test e2e/google-click-required.spec.ts --project=chromium`
  depuis `apps/web-app` : option et annulation, enregistrement, délai Jouer et
  reprise d’erreur, fixtures synthétiques à 1280×720, 1280×600 et 390 px.
- Aucun écran modifié par ce correctif ; les captures existantes servent à
  contrôler la non-régression du parcours.

## Mise en production

Résultats locaux du 24 octobre 2026 : 8 tests API/SQL réussis, 7 tests Playwright
réussis, build SaaS réussi et vérification UTF-8 réussie. Le lint ne présente
aucune erreur ; quatre avertissements préexistants de navigation Next.js
subsistent dans des composants hors périmètre. Captures 1280×720, 1280×600 et
390×844 inspectées : avertissement et boutons lisibles et accessibles.

La migration SQL est nécessaire même sans nouveau déploiement applicatif :
le blocage se situe dans le trigger de la base de production.
Avant application autorisée, consigner la cible, le SHA candidat et la preuve
de sauvegarde selon `docs/MIGRATION_RELEASE_RUNBOOK.md`.
Après application, exécuter `supabase/checks/google_warning_versions_643.sql`
(lecture des catalogues uniquement), puis vérifier la définition : liste v1/v2,
`SECURITY DEFINER`, `search_path=public`, droits privés conservés.
L’existence de la table seule ne prouve pas que ce correctif est appliqué.

Recette propriétaire : dans le jeu à modifier, activer le clic Google requis,
accepter le texte actuel puis enregistrer. Vérifier le succès et la persistance
de l’option à la réouverture. L’opération enregistre les modifications du
formulaire : vérifier son contenu avant de l’effectuer sur un jeu réel.
Ne pas créer de partie, gain ou envoi d’e-mail pour cette vérification.

## Retour arrière

Un rollback applicatif peut conserver cette migration additive, compatible v1.
Le script `supabase/rollback/20261024150000_google_warning_versions_643.sql`
rétablit la fonction v1 d’origine sans supprimer de preuve ni modifier les jeux.
**Il réintroduit le refus des sauvegardes v2**, y compris pour un jeu déjà lié
à une preuve v2 : le réserver à un besoin de restauration explicitement validé.
Le test isolé couvre rollback, conservation des lignes et réapplication.

Une future modification du texte exige une nouvelle version, une migration
explicite autorisant cette version et le passage des tests couplant application
et SQL ; ne pas réécrire une migration déjà appliquée.
