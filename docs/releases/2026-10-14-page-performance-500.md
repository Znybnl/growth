# Écrans marchands — performances #500

## Périmètre approuvé

Accueil, Campagnes, Résultats et Mon compte : réduire les transferts et les allers-retours, sans changer les règles métier #496/#498, l'authentification, les permissions, les stocks, les envois ou la présentation. Aucun cache partagé de données nominatives et aucun nouveau fournisseur/forfait.

## Analyse de référence

Navigation interne HAR, un échantillon par écran : Accueil 3 786 ms ; Campagnes 2 053 ms ; Résultats 2 142 ms ; Mon compte 1 928 ms. Il s'agit de la fin de la réponse RSC, pas d'une mesure de peinture/LCP.

La lecture initiale de 26 campagnes transférait 1 883 666 octets de JSON depuis Supabase, principalement des images encodées. Une projection expérimentale des seuls champs du sélecteur donnait 4 425 octets ; ce n'est pas la taille du nouveau contrat complet. Les mesures locales de cette projection ne constituent pas un gain Vercel garanti.

L'ancienne résolution d'un compte à huit sites demandait douze lectures DB ; le nouveau parcours en demande six, hors validation Auth, avec chargement parallèle du profil principal et de l'adhésion.

## Corrections

- Nouvelle RPC privée paginée `get_merchant_page_overview` : liste blanche de champs, images nulles, aucune configuration d'affiche/e-mail ; métriques canoniques et attentes agrégées, sans contacts.
- Réutilisation par `React.cache` du même snapshot et des lots pendant un rendu serveur, avec clé primitive d'établissement. Pas de conservation inter-requêtes. Hors rendu React, aucune promesse de déduplication.
- Activité indépendante démarrée en parallèle ; suppression des lectures supplémentaires d'opt-ins et des anciens replis qui téléchargeaient tout l'historique.
- Résultats contrôle l'appartenance avant lecture des contacts ; ne projette que `campaign_local_settings->prizeSettings` pour les conditions. Les écrans d'édition et les médias stockés ne sont pas modifiés.
- Profils des sites d'une adhésion chargés par lots bornés à 200, paginés ; rôles, ordre, exclusion des sites archivés et repli existant conservés.
- Nouvelle RPC privée `get_merchant_operational_alerts` : compteurs et liens uniquement. Exclut les incidents traités, gains expirés/retirés/perdants ; stocks actifs et seuil commun 20 %.
- Un fournisseur d'alertes partagé entre navigation et Accueil, non bloquant. Rafraîchissement après mutation ; invalidation en cours de lecture rejouée ; changement de compte/site remet l'état à zéro et annule l'ancienne requête.
- Traces serveur `okado.performance` : étape fixe, durée, succès uniquement. Pas d'ID, URL, e-mail, message d'erreur ni payload. Désactivation par `OKADO_PERFORMANCE_LOGS=false`. Un `success:false` peut aussi correspondre à une redirection ou au mécanisme de rendu dynamique Next, pas seulement à une panne.

## Migration obligatoire AVANT déploiement applicatif

Faire valider/jouer `supabase/migrations/20261014150000_merchant_page_performance_500.sql`, après les migrations #496/#498 et les incidents #487 déjà requis par main.

Cette migration ajoute deux fonctions de lecture, sans backfill ni modification de données. Fonctions `SECURITY DEFINER`, search_path fixé, exécution interdite à PUBLIC/anon/authenticated et autorisée à service_role uniquement. Les handlers utilisent exclusivement l'établissement de la session vérifiée. Si elle manque, les lectures échouent explicitement plutôt que fabriquer des zéros ou télécharger tout l'historique.

La région Vercel observée est iad1. La région primaire Supabase n'a pas pu être confirmée via les accès disponibles : aucun changement de région n'est inclus. Ne pas déplacer les fonctions sur la seule base de la localisation d'un point d'entrée réseau.

## Vérifications et recette

- `npm run test:metrics -w @okado/web-app` : métriques réelles PostgreSQL/PGlite, parité ancien/nouveau, >1000 gains, isolation, poids sans images, ACL et rollback.
- `npm run test:page-performance -w @okado/web-app` : vrais repositories/handler, session multi-sites, pagination à plafond réduit, conditions et opt-ins, logs sans données privées.
- Suites `test:admin-campaigns`, `test:admin-profiles`, `test:participations`, `test:support-incidents`.
- `npx playwright test e2e/page-performance.spec.ts` avec serveur local isolé : vraie coquille + alertes Accueil, une requête partagée, rafraîchissement concurrent, site changé, erreur API, mobile 390 px. Fixture synthétique inaccessible en production.
- Lint et build de web-app ; quatre avertissements de navigation préexistants, aucun nouvel avertissement attendu.

Avant/après production : même compte et même site, cinq navigations froides puis cinq chaudes par écran. Comparer médiane/p95 des réponses RSC, peinture via DevTools, traces auth/data/page et nombre de requêtes d'alertes. Les traces page mesurent les attentes du composant serveur, pas la sérialisation finale, le transfert ni la peinture navigateur. Aucun temps après correction en production n'est annoncé avant migration et déploiement.

Recette propriétaire : comparer indicateurs/listes/recherche/pagination et conditions des lots ; vérifier édition/affiche/logo ; changer de site ; acquitter un incident puis vérifier les alertes sans rechargement. Aucun e-mail réel n'a été envoyé par ces tests.

## Retour arrière

Redéployer d'abord la version applicative précédente. Puis, si nécessaire, jouer `supabase/rollback/20261014150000_merchant_page_performance_500.sql` qui retire uniquement les deux fonctions ajoutées. Les anciennes RPC restent intactes et aucune donnée n'est supprimée.
