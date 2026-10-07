# Issue #484 — Notifications simultanées et détail de retrait

Issue : https://github.com/Znybnl/growth/issues/484. La demande est traitée dans une PR dédiée, séparée de la PR #483 qui ne concerne que l’espacement des cartes. Merge, migration de production et déploiement restent soumis à la validation du propriétaire.

## Résultat utilisateur

Dans **Mon compte → Utilisateur**, l’utilisateur peut cocher indépendamment « À chaque gain », « Synthèse quotidienne », « Synthèse hebdomadaire » et « Synthèse mensuelle », y compris plusieurs options à la fois ou aucune. Le réglage reste personnel par établissement, désactivé par défaut. Un gain peut donc être envoyé immédiatement et réapparaître dans chaque synthèse sélectionnée. L’activation d’un canal ne rejoue pas ses gains antérieurs ; retirer un canal annule seulement ses jobs et événements en attente. Les e-mails déjà remis à Resend ne peuvent pas être rappelés.

Chaque ligne d’une synthèse garde date/heure, participant, jeu et lot, puis une unique colonne « Expiration / retrait » : « Récupéré » si le statut du gain est retiré, sinon la date d’expiration ou « Sans date d’expiration ». Quand le gain est récupéré, la date d’expiration n’est pas affichée.

Pilotage → Voir la fiche affiche en lecture seule l’ensemble des options activées. Les choix, événements et emplois d’un autre utilisateur/site ne sont pas mélangés.

## Données et migration

`supabase/migrations/20261007_multi_gain_notifications_484.sql` ajoute la liste `enabled_frequencies`, conserve la colonne `frequency` comme projection mono-option pour compatibilité, et conserve la RPC mono-canal comme adaptateur. Les préférences existantes sont migrées sans activation supplémentaire : une option existante reste la seule sélectionnée, une préférence désactivée reste vide. Les événements en attente conservent leur ancien canal ; les événements attachés à un job prennent le canal de ce job. Les événements historiques non attribuables à un canal sont supprimés de la file, jamais convertis en gains à réenvoyer.

La clé de l’outbox inclut maintenant le canal. La nouvelle RPC valide le choix, le périmètre utilisateur/site, met à jour les préférences et annule uniquement les jobs/canaux désélectionnés. Les snapshots d’e-mail intègrent `rewardExpiresAt` et `redeemed` depuis le lead au moment de la préparation ; les logs et événements restent non nominatifs. Pas de changement au tirage, aux campagnes, au stock, aux retraits, au consentement ni à l’e-mail du participant.

## Vérifications et recette

- `npm run test:gain-notifications -w @okado/web-app` : **37/37**, migration PGlite, routes, multi-sélections, mêmes gains dans les quatre canaux, activation non rétroactive, désactivation sélective, statut récupéré/date exclusifs et reprises.
- `npm run test:admin-profiles -w @okado/web-app` : **17/17**, fiche Pilotage, listes multi-options et isolation utilisateur/site.
- `npm run test:e2e -w @okado/web-app -- e2e/gain-notification-settings.spec.ts e2e/admin-establishment-profile.spec.ts` : **11/11**, 320, 390 et 1280 px, choix simultanés, changement d’établissement, désactivation et absence de débordement.
- `npm run lint:web` : zéro erreur, quatre avertissements ESLint préexistants ; `npm run build:web` et `npm run verify:source` réussis. Aucun envoi réel, aucune préférence réelle modifiée et aucune migration de production.

Recette propriétaire après preview : sélectionner « À chaque gain » + une synthèse, vérifier que les deux sélections restent cochées ; vérifier dans un e-mail de synthèse qu’un gain récupéré affiche uniquement « Récupéré », et qu’un gain non récupéré affiche uniquement sa date d’expiration (ou « Sans date d’expiration »). Vérifier que décocher une synthèse n’efface pas les autres options.

## Retour arrière

La migration est additive et garde les anciens noms de colonnes/RPC nécessaires à la compatibilité. En cas de régression, remettre l’application au déploiement précédent : l’ancienne UI mono-choix continue de lire la colonne `frequency` (projection de la première option) et d’écrire via l’ancienne RPC, laquelle remet une option unique ou désactive tout. Conserver la nouvelle colonne, la clé de l’outbox et les données ; ne pas tenter de rollback SQL destructif ni de rejouer les gains. Le dispatcher peut être désactivé avec le mécanisme opérationnel existant, selon le runbook notifications #473.

## État de livraison

La branche de travail est isolée. La migration n’est pas appliquée à une base cible. La PR n’est pas fusionnée et rien n’est déployé en production ; le merge et la release attendent la validation de Pierre-Henri BRUNELLE.
