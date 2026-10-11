# Supervision en tableaux — #489

## Résultat et périmètre

Les quatre sections E-mails, Webhooks, Gains et Journal sont superposées en pleine largeur et présentent leurs données dans des tableaux sémantiques. Les styles et badges existants sont réutilisés. Les messages d’erreur dépassant 200 caractères sont dépliables, sans perte de contenu. Les filtres restent côté serveur et l’action d’acquittement #487 est inchangée.

Présentation uniquement : aucun changement de requête, de permission, d’envoi, de webhook ou de gain ; aucune migration. Les données sensibles ne sont pas sérialisées vers un nouveau composant client. Le décor de test utilise exclusivement des identités fictives et reste inaccessible en production.

## Vérifications

- `npm run test:support-incidents -w @okado/web-app` : 7 tests serveur/SQL réussis, incluant le rendu de la vraie page, les quatre sections, recherche/statuts, historique, échappement HTML et refus marchand.
- `PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -w @okado/web-app -- support-tables.spec.ts support-email-incidents.spec.ts --project=chromium` : 7 scénarios réussis. Tests des vrais tableaux à 320/390/1280 px, disposition superposée, défilement au clavier, textes longs, absence de débordement, détails dépliables, action, historique et états vides. Les succès d’API sont interceptés ; aucun incident réel n’est traité.
- `npm run lint:web`, `npm run build:web`, `npm run verify:source`, `git diff --check` : réussis ; quatre avertissements lint préexistants hors périmètre. Captures desktop/mobile inspectées.
- Build servi localement : `/dev/support-tables` et `/dev/support-email-incidents` doivent renvoyer 404 ; accès visiteur à `/support` redirigé vers la connexion.

## Recette et retour arrière

Avec le compte administrateur, ouvrir `/support`, vérifier les colonnes et les filtres, puis consulter « Traités ». Sur mobile, faire défiler chaque tableau horizontalement. Ne marquer un véritable incident traité que s’il doit être acquitté. La preuve synthétique ne remplace pas cette validation avec une session administrative.

Merge et production après validation propriétaire. Retour arrière : précédent déploiement ; aucune donnée ou migration à inverser.
