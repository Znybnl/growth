# Runbook incident — Okado

Cette procédure vise le rétablissement rapide, sans exiger de connaissances techniques approfondies du propriétaire.

## Objectif interne de rétablissement

- **Perte de données maximale visée (RPO)** : 24 heures.
- **Délai de rétablissement maximal visé (RTO)** : 8 heures.

Ces objectifs internes ne constituent pas un engagement contractuel. Ils servent à dimensionner les sauvegardes, les tests de restauration et la priorité donnée à un incident.

## Quand l'utiliser

- une page de jeu, l'inscription, la connexion ou le retrait est indisponible ;
- une régression empêche les marchands ou joueurs d'utiliser un parcours critique ;
- une erreur peut affecter des données, des lots, des e-mails ou des autorisations ;
- un incident de sécurité ou une exposition de données est suspecté.

## Procédure courte

1. **Constater** : noter l'heure, l'URL ou le jeu concerné, une capture et le comportement observé.
2. **Qualifier** :
   - **P0** : indisponibilité, incident de sécurité, données erronées ou retrait incorrect à grande échelle ;
   - **P1** : défaut important mais contournable ou limité à un parcours secondaire.
3. **Rétablir** : pour un P0 lié à un déploiement, rollback Vercel vers le dernier déploiement sain avant toute analyse longue. Désactiver temporairement un jeu si le problème est isolé à ce jeu.
4. **Vérifier** : rejouer le parcours affecté, contrôler les erreurs et confirmer que la production est redevenue utilisable.
5. **Corriger** : créer une Issue, analyser la cause, préparer une branche et une PR avec les tests adaptés.
6. **Documenter** : ajouter à l'Issue la cause, l'impact, le correctif et une action de prévention. Aucun blâme ; l'objectif est d'éviter la répétition.

## Règles de sécurité

- Ne jamais supprimer, modifier ou restaurer massivement des données de production dans l'urgence sans analyse et accord explicite de Pierre-Henri BRUNELLE.
- Si une fuite de données est suspectée, limiter immédiatement l'accès concerné, préserver les éléments utiles à l'analyse et ne pas publier de détail sensible dans une Issue publique.
- Les sauvegardes et secrets sont accessibles uniquement par Pierre-Henri BRUNELLE.

## Saturation du stockage des fonctions Vercel

En cas d'alerte sur le **Function Storage** :

1. Relever la métrique exacte, sa période et les fonctions ou déploiements concernés dans Vercel avant toute suppression.
2. Vérifier les écritures dans le système de fichiers des fonctions. Le stockage local d'une fonction est éphémère et ne doit contenir que des fichiers temporaires nécessaires à la requête.
3. Vérifier en priorité les routes qui génèrent des fichiers ou utilisent `node:fs`, `tmpdir()` ou une librairie de traitement d'images.
4. Ne jamais utiliser le système de fichiers d'une fonction pour conserver une donnée métier, une image utilisateur ou un export durable. Utiliser Supabase Storage ou la base prévue.
5. Après correction, lancer une série de requêtes représentative, vérifier l'absence de croissance continue et contrôler les logs runtime Vercel.
6. Si la métrique reste saturée après correction, ouvrir une demande Vercel avec l'identifiant du projet, la période et les identifiants de déploiement concernés.

## Décision simple

| Situation | Première action recommandée |
|---|---|
| Dernier déploiement a cassé un parcours public | Rollback Vercel immédiat. |
| Un seul jeu présente un comportement dangereux | Désactiver le jeu, puis analyser. |
| Données, autorisations ou sécurité sont en cause | Stopper le périmètre concerné et analyser avant toute modification. |
| Défaut visuel ou contournable | Créer une Issue et corriger par le cycle normal. |

## Après rétablissement

Un incident P0 doit produire une Issue de suivi avant le prochain déploiement important. Si un même type d'incident revient, ajouter un test automatisé ou un garde-fou au processus.

## Seuils d'alerte du pilote

Ces seuils sont des seuils opérationnels de départ, à réévaluer après les premiers usages :

| Signal | Seuil initial | Première action |
|---|---:|---|
| Erreurs HTTP 5xx sur les parcours publics | > 1 % sur 5 minutes ou 5 erreurs consécutives | Vérifier le dernier déploiement et préparer un rollback Vercel |
| Échec de la maintenance quotidienne | 1 exécution manquante ou en erreur | Vérifier le cron, les logs et l'expiration des sessions |
| Webhooks Stripe ou Resend en échec | 3 échecs consécutifs | Vérifier la signature, le fournisseur et les livraisons en attente |
| Erreur Supabase sur une route métier critique | 3 erreurs en 5 minutes | Vérifier la disponibilité, les migrations et les règles RLS |

Le responsable du pilote est Pierre-Henri BRUNELLE. Les alertes doivent rester dépourvues de données personnelles : identifiants techniques, horodatage, route et statut uniquement.

## Webhook Resend désactivé — #573

- Resend transmet `svix-id`, `svix-timestamp`, `svix-signature`. Le handler les normalise pour le SDK ; les anciens noms `webhook-*` ne servent que de repli complet, jamais de complément à des en-têtes Svix partiels.
- `Headers webhook Resend manquants` signifie un refus **avant** vérification du secret. Un POST manuel sans ces en-têtes doit être refusé et ne valide pas le fonctionnement du webhook. Consulter une livraison signée dans Resend, pas un simple accès navigateur.
- Conserver `request.text()` sans transformation et vérifier signature/horodatage avant toute écriture. Ne jamais supprimer la vérification pour « débloquer » les événements. Le secret de cet endpoint doit correspondre à `RESEND_WEBHOOK_SECRET` côté serveur de production ; une modification de variable Vercel demande un nouveau déploiement pour être prise en compte. Ne pas recopier sa valeur dans l'Issue ou les logs.
- Après accord du propriétaire et déploiement : choisir **un événement récent ciblé**, le rejouer dans Resend si disponible, contrôler HTTP 200 `{received:true}` et sa présence dans Supervision, puis réactiver l'endpoint (ou le réactiver d'abord si le tableau de bord l'impose). Vérifier ensuite un nouvel événement. Le statut d'envoi d'un e-mail et la réception de son webhook sont deux preuves différentes.
- HTTP 400 : en-têtes absents ou signature/horodatage refusé. HTTP 503 : vérification passée, persistance indisponible ; diagnostiquer le stockage avant de rejouer. HTTP 500 « secret manquant » : configuration serveur absente. Ne jamais renvoyer l'e-mail de gain pour réparer uniquement le suivi.
- Limite existante : la synchronisation applique le statut reçu et archive chaque réception sans déduplication par identifiant Svix ni protection contre les événements hors ordre. Ne pas rejouer en masse l'historique : un ancien `email.sent` pourrait remplacer un statut plus récent et des lignes d'historique peuvent être dupliquées. Une reprise exhaustive exige une analyse et un correctif dédiés, pas une suppression d'historique.

Preuves, commandes et retour arrière : [livraison #573](releases/2026-10-18-resend-webhook-573.md).
