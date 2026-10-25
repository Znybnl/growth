# Destinataires de duplication administrative — #619

## Cause confirmée

Le SELECT `merchants` avec `merchant_users!inner(id)` n’indiquait pas la clé
étrangère souhaitée. Les préférences de notifications ont ajouté un second
chemin détectable par PostgREST entre ces deux tables : le rattachement direct
du compte et les destinataires des notifications. Le serveur renvoie PGRST201
(HTTP 300) pour cette ambiguïté, même sans recherche.

Contrôle du 25 octobre 2026 sur la cible configurée : ancienne projection
refusée ; même projection qualifiée par
`merchant_users!merchant_users_merchant_id_fkey!inner(id)` acceptée en HTTP 200.
Ces deux appels utilisent `limit(0)` : aucune coordonnée lue, aucune écriture,
aucune session créée, aucun e-mail ou jeu dupliqué. Aucun secret conservé dans
la preuve. La reproduction ne constitue pas un déploiement du correctif.

Contrôle complémentaire de la première page (lecture seule, plage 0–50) :
HTTP 200, 19 comptes retournés, aucune page suivante. Seuls ces compteurs sont
conservés ici ; aucune identité ou coordonnée n’est publiée. Cela confirme la
lecture réelle de la liste corrigée, pas une duplication ou une recette connectée.

## Correctif et impact

- La requête nomme explicitement la relation du compte. Projection minimale,
  filtre actif, tri stable, recherche littérale et pagination existants conservés.
- La route journalise l’étape et, s’il est disponible, uniquement un code
  SQL/PostgREST filtré. Aucun message brut, recherche, coordonnées ou payload
  de base dans le log ou la réponse. Réponse d’erreur privée, non cachée.
- La popin sépare chargement, erreur et résultat vide. Une erreur ne montre
  plus « Aucun compte… » ni une pagination trompeuse ; Réessayer relance la
  lecture avec les mêmes filtre/page ou le même compte, sans duplication.
- Les erreurs de création et les copies partielles gardent leur suivi distinct.

Frontend-design a guidé une correction d’états uniquement, sans refonte visuelle.
Authentification administrateur, propriété de la source, association des cibles,
anti-CSRF, brouillons, stocks, médias et historique restent inchangés.
Aucune migration SQL ni modification de permissions ou données.

## Vérifications

- `npm run test:admin-campaigns -w @okado/web-app` : 45/45, dont ambiguïté de
  relation dans la base simulée, filtrage par rattachement direct, plus de
  50 comptes, refus d’accès et erreur privée/journalisation minimale.
- `npx playwright test e2e/admin-campaign-duplication.spec.ts
  e2e/admin-campaign-access.spec.ts --project=chromium` : 19 succès, 1 ignoré
  faute de compte marchand E2E configuré. Le refus marchand est aussi testé
  par les vrais handlers avec infrastructure simulée dans la suite serveur.
- Dernière relance après ajout de la conservation du filtre lors du réessai :
  11/11 tests de `admin-campaign-duplication.spec.ts`, ESLint ciblé réussi.
- Captures erreur/reprise inspectées à 1280×600 et mobile 390 px ; contrôles
  automatiques supplémentaires à 1280×720 et 320 px, clavier et débordements.
- Lint sans erreur (quatre avertissements préexistants hors périmètre), build
  Next.js/TypeScript et `npm run verify:source` réussis.
- Tests de duplication sur données fictives et API interceptées ; contrôle HTTP
  réel du refus visiteur. Aucune création chez un marchand réel.

## Recette propriétaire après autorisation de livraison

Depuis un jeu de son établissement actif : ouvrir Dupliquer vers un marchand,
vérifier la liste initiale, rechercher un compte, naviguer entre pages puis
sélectionner ses établissements. Sur un jeu/compte pilote explicitement choisi,
créer un brouillon et vérifier qu’il appartient à la cible et reste non publié.
La recette réelle avec écriture n’a pas été lancée pendant le développement.

## Livraison et retour arrière

Branche `codex/issue-619-admin-duplication`, PR dédiée ; validation propriétaire
avant merge et déploiement. Aucun SQL à appliquer. Retour arrière applicatif
par restauration du déploiement précédent, sans restauration de données ; ce
rollback réintroduirait cependant l’ambiguïté de lecture tant que le schéma
contient les deux relations.
