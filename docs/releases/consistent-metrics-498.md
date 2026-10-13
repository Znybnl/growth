# Livraison #498 — Cohérence des indicateurs

## Résultat et périmètre

Les neuf divergences de l'audit sont traitées : clics réels de toutes les actions,
dates de retrait partagées, premier jour complet, attentes hors pertes/expiration,
seuil de stock 20 %/épuisé distinct, essais applicatifs, opt-ins API, conversion
pondérée et lectures non tronquées. Accueil/Campagnes/Résultats/API gardent les
formules de #496 ; consommation indépendante du stock. Les listes se nomment
contacts, pas participations anonymes. Pilotage indique l'unité établissement.

## Migration obligatoire avant déploiement

`supabase/migrations/20261013150000_consistent_metrics_498.sql`

- Ajoute les agrégats privés et la vue de dates effectives ; remplace les corps
  overview/summary/synthèse sans changer leurs signatures existantes.
- Ajoute le trigger date/état de retrait et la RPC idempotente de clic.
- Corrige les références ambiguës des RPC caisse/forcées et utilise now() en
  timestamptz. Contrôles de droits, motif et achat conservés ; aucun appel Stripe.
- Aucun UPDATE d'historique, purge, stock, consentement ou file d'e-mail.
- Un ancien retrait sans date utilise uniquement son événement vérifiable,
  postérieur à la création et à la dernière réinitialisation. S'il n'existe pas,
  le retrait reste dans le total et une notice Résultats signale sa date inconnue.
- Les synthèses futures/préparées après correction lisent cette même source.
  Les e-mails et payloads déjà figés ne sont ni régénérés ni renvoyés.

Le SQL est réexécutable. Il doit être joué par le propriétaire sur la cible
validée, après preuve de sauvegarde suivant MIGRATION_RELEASE_RUNBOOK.
Le candidat n'est pas certifié en production par les tests locaux. Ne pas
déployer sans migration : les nouveaux RPC manquants sont signalés comme
indisponibles, pas remplacés par des zéros fictifs.

## Retour arrière

Rollback applicatif vers le dernier déploiement sain en premier. L'extension
est compatible avec les anciennes signatures de lecture. L'ancien détail de
clics peut être incomplet jusqu'au déploiement du nouveau rendu (catégorie
historique -1 non présentée par l'ancien code).

Si nécessaire, puis uniquement après validation, jouer
`supabase/rollback/20261013150000_consistent_metrics_498.sql` : restaure les
anciens corps SQL et retire les objets nouveaux. Les dates enregistrées et les
clics restent présents ; aucun historique n'est effacé. Le rollback SQL ne doit
pas être joué alors que le nouveau code est encore servi.

## Vérifications et recette

- `npm run test:metrics -w @okado/web-app` : SQL réel sous PGlite, >1000 contacts,
  opt-ins/retraits/attentes, concordance overview/summary/synthèse, scopes,
  défaut sans preuve, premier jour UTC, rollback, droits anon/authenticated,
  RPC clics idempotente, vrais repository/handlers et panne sans faux zéro.
- Rejouer participations, notifications, e-mail de gain, Supervision et essais.
- `e2e/participation.spec.ts` : vrai client 320/390/1280 px, deux clics volontaires
  distincts, contexte de visite, grattage anonyme et preview sans événement réel.
  Toutes les API métier sont interceptées. Fixture développement seulement.
- Lint/build et `npm run verify:source`. `check:supabase` vérifie les nouveaux
  objets après migration, sur la cible explicitement autorisée ; ce script
  historique touche aussi des verrous/rate limits de diagnostic, donc ne pas
  le confondre avec un audit strictement en lecture seule.
- Recette propriétaire : même jeu/site dans Accueil, Campagnes, Résultats ;
  comparer retraits et consommation, regarder les opt-ins, la catégorie de
  clics historiques, les courbes UTC et les stocks faible/épuisé. Pilotage :
  essais inclus, contacts nommés correctement, gain expiré absent de l'attente.
- Une synthèse locale close et un total cumulé ne sont pas le même périmètre.
  Les erreurs de lecture restent visibles. Les contacts/opt-ins ne sont pas
  automatiquement dédupliqués par personne ; les coûts estimés gardent leur
  définition actuelle (coût courant des lots attribués).

## Impact/sécurité

Pas de prévisualisation dans les métriques réelles, aucune coordonnée nouvelle,
aucun secret/log nominatif. Un clic ne prouve jamais une action externe réalisée.
Les identifiants techniques de visite/clic ne sont pas des coordonnées et restent
dans le cycle de conservation des événements existants. Les contrôles retrait,
PIN, motif, achat et isolation des établissements ne sont pas relâchés.
La lecture d'un export avec un identifiant de jeu fourni par l'appelant intersecte
explicitement les jeux de l'établissement autorisé avant de lire les contacts,
y compris dans le backend mémoire. Cette garde est testée avant toute pagination.

## Preuves locales du 13 octobre 2026

18 tests dédiés aux métriques, 11 participations, 40 notifications, 16 e-mails,
15 Supervision, 37 assistance administrative, 17 fiches établissements et 4 essais
passants. Sept E2E Chromium passent à 320/390/1280 px. Lint sans erreur (quatre
avertissements de navigation préexistants), build et vérification UTF-8/source
passants. Revue React : aucun chargement de coordonnées ajouté au client,
requêtes indépendantes parallèles, métadonnées de clic créées uniquement lors
de l'interaction, notices sans faux zéro. Les tests ne certifient pas un schéma
de production sur lequel la migration n'a pas encore été appliquée.

La validation fonctionnelle, la migration sur la cible et le merge/déploiement
attendent l'instruction du propriétaire ; rien n'a été appliqué à la production
pendant l'implémentation ou les tests.
