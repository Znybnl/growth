# Réception Resend — issue #573

## Résultat utilisateur

Rétablir la réception des événements Resend et donc la fraîcheur du suivi dans Supervision. Les e-mails envoyés aux joueurs/marchands, leurs destinataires, les gains, les stocks et les préférences restent inchangés. Aucune migration.

## Diagnostic et correction

Le handler attendait exclusivement les noms `webhook-*`, alors que les livraisons documentées par Resend utilisent `svix-*`. Il répondait 400 avant même la vérification du secret. Le SDK utilise lui-même une représentation interne normalisée ; ses noms internes ne sont pas ceux à rechercher dans la requête entrante. Référence : https://resend.com/docs/webhooks/verify-webhooks-requests.

Le handler privilégie désormais un jeu Svix complet. Les anciens noms ne sont acceptés qu'en l'absence de tout en-tête Svix. Le corps brut, le vrai SDK et sa vérification temporelle restent obligatoires. Une signature refusée donne 400 ; une panne de persistance donne 503, sans message interne ni secret. L'accusé 200 suit toujours la persistance attendue.

## Vérifications locales

- `npm run test:resend-webhook -w @okado/web-app` : 12 tests réussis, vrai SDK, aucune requête fournisseur.
- `npm run test:support-incidents -w @okado/web-app` : 15 tests réussis.
- `npm run test:gain-notifications -w @okado/web-app` : 40 tests réussis.
- `npm run test:reward-email -w @okado/web-app` : 16 tests réussis.
- `npm run lint:web` : réussi, 0 erreur et 4 avertissements préexistants de navigation.
- `npm run build:web` : réussi, Next.js 16.3.8.
- `npm run smoke:resend-webhook -w @okado/web-app` : serveur compilé → vrai SDK → vraie DAL → fixture REST locale ; 400 sans écriture, 200 avec mise à jour/archivage attendus, 503 sur panne simulée et 200 après reprise. Aucun e-mail réel, aucune base réelle.

La CI rejoue les tests de signature et le smoke après build. La branche repose sur le correctif de sécurité #572 ; tant que celui-ci n'est pas fusionné, la PR est empilée sur sa branche pour isoler le diff webhook. Retargeter sur main après livraison de #572.

## Production : preuves et limites

Lecture Vercel du 18 octobre 2026 : `app.okado.app` correspond au projet `growth`, déploiement READY de `main`, SHA `be3ea3adf78970c85c2dd7621faece098a42b7eb` (avant ce correctif). La recherche des logs du webhook sur les 15 dernières minutes ne retourne aucun résultat ; elle ne permet pas de conclure à une réparation. L'historique du 13 octobre n'est pas accessible dans la rétention de logs Hobby. La valeur du secret n'a pas été lue ni modifiée par l'agent, sa correspondance avec Resend n'est pas encore prouvée.

Le webhook n'a pas été réactivé, aucun événement réel rejoué et aucun e-mail envoyé pendant ces tests. La correction locale ne constitue pas une preuve de réception en production.

Un POST négatif sans données personnelles, avec les trois noms d'en-têtes Svix et une signature volontairement invalide, reproduit en production HTTP 400 « Headers webhook Resend manquants ». Cela confirme le mauvais nommage avant vérification ; cela ne valide ni la signature réelle ni la correspondance des secrets. Aucune écriture n'est atteinte sur ce chemin.

## Recette et rollback

Après validation explicite : fusionner le prérequis sécurité puis cette PR, vérifier le déploiement du bon SHA et la présence de `RESEND_WEBHOOK_SECRET` dans l'environnement production. Si le secret a été modifié après le déploiement, redéployer. Ne pas exposer la clé.

Suivre le [runbook](../INCIDENT_RUNBOOK.md#webhook-resend-désactivé--573) : replay ciblé d'un événement récent, 200 et présence dans Supervision, réactivation puis observation d'un nouvel événement. Ne pas rejouer tout l'historique : déduplication et ordre des événements ne sont pas garantis par la DAL actuelle, conservée sans migration dans ce correctif.

En cas de régression : revenir uniquement sur le commit #573, en conservant la mise à jour sécurité #572. Le retour de l'ancien handler réintroduirait le refus des en-têtes Svix ; suspendre alors la réception chez le fournisseur avec accord propriétaire et conserver l'historique. Aucun rollback de données ou nouvel envoi de gain nécessaire.
