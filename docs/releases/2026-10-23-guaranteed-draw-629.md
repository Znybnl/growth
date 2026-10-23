# Tirage 100 % gagnant — #629

## Décisions propriétaire

23 octobre 2026 : la case ne répartit pas automatiquement la part perdante dans
l'éditeur. La publication conserve ses contraintes (total 100 % et stock illimité).
La prévisualisation peut continuer à forcer un gain. En jeu réel 100 % gagnant,
un lot à 0 % ne gagne jamais, les poids positifs disponibles sont normalisés
proportionnellement et aucun jeu ne démarre sans lot éligible. Le rendu des
segments n'intervient pas dans le tirage.

## Implémentation et périmètre sensible

La RPC privée `select_guaranteed_campaign_prize` verrouille campagne puis lots
éligibles dans l'ordre créé/id. Elle utilise les poids numériques strictement
positifs, y compris 0,01 %, et un tirage uniforme PostgreSQL `random()` dans
[0,1). Cumul / somme des poids, borne supérieure stricte ; le dernier cumul
vaut 1. Aucun plancher à 1 % ni sélection arbitraire en repli.

Les deux RPC réelles (préparation de session et ancien tirage direct) utilisent
ce sélecteur uniquement en mode 100 % gagnant. Une erreur sans lot interrompt
la transaction avant création de session/lead/événement ; aucun stock n'est
décrémenté. Le handler libère le verrou de participation quotidien sur échec,
sans cookie de participation ni événement de succès. Les stocks limités sont
réservés comme avant, l'illimité reste NULL. La restitution des réservations
expirées et l'ordre session/campagne compatible avec la finalisation restent
inchangés. Le fallback mémoire suit la même sélection positive et refuse aussi
l'absence de lot éligible. Le moteur normal et le mode prévisualisation ne changent pas.

Aucune migration des probabilités, stocks ou gains historiques. Pas de nouvelle
table, politique RLS ou permission élargie. Le nouveau helper est invoker,
search_path public, exécutable seulement par service_role ; les anciennes RPC
restent privées. L'explication est ajoutée dans wizard et éditeur classique.
La relecture React n'introduit ni hook, fetch, nouvelle dépendance ou état partagé.

## Tests et limites

- `npm run test:guaranteed-draw -w @okado/web-app` : 11 tests, helper mémoire,
  vrai handler avec infrastructure simulée et fonctions SQL réelles sous PGlite.
- Poids 0 / 0,25 / 0,75, stocks zéro/illimités/dernière unité, bornes 0 et
  proche de 1 côté JS, échantillon SQL reproductible 10 000 tirages (25/75),
  absence de perte, refus sans écriture, réapprovisionnement et expiration.
- Migration réexécutable, rollback exécuté, fonctions invoker privées, refus
  anon/authenticated et vérification de déploiement en lecture seule testés.
- PGlite sérialise ses requêtes : deux appels concurrents côté JS testent
  l'absence de double réservation dans ce moteur, pas un stress multi-connexion
  de Supabase. Les verrous SQL sont inspectés ; ne pas annoncer un test de
  concurrence de production ou une certification du générateur aléatoire.
- `test:participations` : 11 contrôles de non-régression réussis.
- `guaranteed-draw-rules.spec.ts` : case sans réécriture des chances,
  aide dans wizard 1280×720/600 et 320/390, éditeur classique à 1280×720.
  Captures inspectées, aide longue défilable sur mobile, pas de débordement horizontal.
- Lint/build SaaS, verify:source, diffcheck et audit de production requis.
  Fixtures/données synthétiques, aucun e-mail ou gain réel, aucune base distante.

## Migration obligatoire AVANT production

1. Sauvegarde identifiée et autorisation propriétaire sur le projet Supabase
   Okado ; suivre `MIGRATION_RELEASE_RUNBOOK.md`. Ne pas appliquer depuis les tests.
2. Jouer `supabase/migrations/20261023120000_guaranteed_draw_probabilities_629.sql`.
3. Exécuter `supabase/checks/guaranteed_draw_629.sql` (lecture seule, vérifie les
   définitions et droits sans effectuer de tirage), puis `check:supabase` et
   `smoke:security` sur la cible autorisée. Consigner SHA/cible/résultat sans secret.
4. Après validation/merge seulement, déployer ; contrôler le parcours sur une
   base de recette. Le mode preview ne prouve pas ce moteur de production.

PR construite au-dessus de #627 pour reprendre ses dépendances corrigées et
le correctif visuel #628. Fusionner #627 d'abord, puis rebaser/retargeter cette
PR sur main avant sa livraison. Aucun merge ni déploiement n'est effectué ici.

## Retour arrière

Application par revert ; fonctions par
`supabase/rollback/20261023120000_guaranteed_draw_probabilities_629.sql`,
sur autorisation propriétaire. Le rollback réintroduit explicitement le plancher
à 1 % et l'ancien repli : préférer un correctif en avant si possible. Il ne
modifie ni gain, stock, session ou probabilité déjà enregistrés. Aucun rollback
SQL n'est effectué automatiquement lors d'un rollback Vercel.
