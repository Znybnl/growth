# Préparation des parties — analyse et mesure #395

## Constat au 25 octobre 2026

Main de production examiné : 2eed595. La PR #396 a déjà supprimé la double
lecture de l'aperçu : createPreviewDrawSession lit une seule fois le bundle.
Le tirage SQL, les stocks, la facturation et les gardes de participation restent
inchangés dans cette proposition.

Les 50 minutes de logs runtime accessibles ne contiennent aucun événement
draw_preparation_timing ni preview_draw_preparation_timing. La requête 24 h
est refusée par la rétention Hobby ; le schéma observability historique renvoie
404. Ce sont des limites de mesure, pas une preuve d'absence de trafic historique.
Les dates de sessions/participations en base ne donnent pas la durée HTTP.
La mesure historique 14 868 ms concerne une seule prévisualisation ancienne.
**p50/p95 réels actuels : non disponibles ; aucune amélioration chiffrée certifiée.**

## Analyse du chemin actuel

- Prévisualisation : limite persistante, lecture du bundle, choix simulé, jeton.
- Réel : cookie quotidien, limite, lecture publique avec action de visite et
  facturation, contrôle Google, verrou quotidien, lecture de configuration et
  facturation dans le repository, RPC transactionnelle, analytics consenties.
- La lecture publique ajoutée pour #638 n'était pas isolée dans les durées.
  Le repository relit sa configuration ; cela prouve deux appels de lecture,
  pas leur coût réseau ni que leur mutualisation serait sûre avec les contrôles.
- Les logs de succès ne suffisaient pas à compter les refus/échecs ; les
  percentiles des seuls succès ne représentent pas toutes les réponses.
- Analytics est attendue avec son délai maximal existant de 1 500 ms en cas
  de consentement. Ne pas supprimer son contrôle ou la déplacer sans mesure.

## Évolution bornée

Une ligne JSON opérationnelle okado.draw_preparation par invocation mesure
le total, le statut, le mode et les étapes effectivement traversées, même si
une étape échoue. Étapes : parse, rateLimit, campaignLookup, dailyLock,
sessionCreation, analytics, releaseLock. Les mesures existantes du repository
restent disponibles pour distinguer lecture et RPC dans une requête Vercel.
Le total s'arrête à la réponse du handler, pas au premier affichage navigateur :
réseau et démarrage à froid avant entrée dans le handler ne sont pas inclus.

Aucun identifiant, IP, e-mail, cookie, token, URL ou message d'erreur libre
dans ce nouveau format. Pas de nouvelle base, fournisseur, rétention, tracking
PostHog, migration ou requête réseau. Les corps/status/cookies et l'ordre des
gardes restent inchangés. Aucun écran modifié.

Le rapport lit les lignes JSON (directes ou champ message Vercel) sur stdin et
ne retourne que des agrégats : volume observé, succès, refus 4xx, erreurs 5xx,
proportion de 5xx, p50/p95 toutes réponses et succès, puis étapes des succès.
Percentiles par rang supérieur, sans moyenne de percentiles. Une étape absente
ou un échantillon vide est indisponible, jamais 0 ms. Un percentile de faible
effectif reste descriptif, pas une certification de performance.

## Protocole après validation et déploiement

1. Dans growth / app.okado.app uniquement, lire les logs de production sur une
   fenêtre inférieure à une heure avec le filtre okado.draw_preparation.
   Ne pas créer de vraie partie ni envoyer un e-mail pour obtenir un échantillon.
2. Exporter les lignes JSONL en local privé ; ne jamais les joindre en brut à
   une Issue. Ne mélanger ni déploiements, ni fenêtres qui se chevauchent, ni
   invocations rejouées/exportées deux fois. Le format anonyme ne dédoublonne pas.
3. Exécuter `npm run report:draw-preparation -w @okado/web-app` avec ces lignes
   sur stdin. Consigner période UTC, SHA, méthode d'export, limite/pagination et
   compte observé ; atteindre la limite signifie un échantillon potentiellement
   tronqué. Zéro ligne n'est pas zéro trafic ni zéro erreur.
4. Comparer réel/aperçu séparément et, pour avant/après, garder période, région,
   type de jeu, consentement et protocole comparables sans collecter de joueurs.
   Documenter toute dimension indisponible. Identifier le poste dominant avant
   de mutualiser des lectures ou déplacer analytics hors du chemin critique.
5. Garder #395 ouverte tant que la comparaison réelle n'est pas établie. Ne pas
   confondre tests synthétiques, preview Vercel et mesures de joueurs réels.

## Vérification et retour arrière

Tests du vrai handler avec dépendances simulées : succès réel/aperçu, ordre des
opérations, Google requis, erreur de tirage/libération, limite, validation et
JSON invalide ; absence de données privées dans la nouvelle ligne.
Tests rapport : percentiles déterministes, séparation des modes/statuts,
mesures absentes, lignes invalides, enveloppe Vercel, filtrage des champs.
Rejouer Google, tirage garanti, participations, analytics, lint et build.
Retour arrière applicatif ; aucun état ou schéma à restaurer. Aucun déploiement
ni partie réelle déclenché pendant cette analyse.

Résultats : 6 tests instrumentation/rapport, 8 Google, 11 tirage garanti,
11 participation et 10 consentement réussis (46 au total). Lint réussi sans
erreur (4 avertissements préexistants hors périmètre), build/TypeScript,
contrôle des sources et diff réussis.
