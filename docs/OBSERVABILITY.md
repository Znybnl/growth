# Observabilité applicative

## Audit des durées de page — 29 octobre 2026, #708

Le [rapport de mesure](audits/2026-10-29-page-loading-708/README.md) distingue
les vitals navigateur historiques, les vues sans chronométrage et les durées
de fonction serveur. La collecte navigateur est désactivée depuis la refonte
du consentement ; les logs `okado.performance` ne constituent pas un historique
hebdomadaire conservé. Les recommandations du rapport ne sont pas activées
par sa publication. Ne pas utiliser la durée de consultation d'une page comme
son temps de chargement.

## Mesures opérationnelles indépendantes du consentement — #710

Instruction du propriétaire du 29 octobre 2026 : mesurer le fonctionnement du
SaaS par les propres logs serveur. Les nouveaux événements ci-dessous ne
dépendent d’aucun cookie ou SDK analytics navigateur. Le consentement, les
replays et la collecte marketing gardent leurs règles existantes.

| Événement | Mesure | Usage correct |
| --- | --- | --- |
| `http_request_completed` | Route fermée, méthode, statut, durée serveur, type API/document/RSC, première requête de l’instance | Compter les requêtes et calculer durées/erreurs par route et version |
| `server_stage_completed` | Noms fixes Auth, workspace, lectures de données et fonctions de page ; durée et résultat | Identifier les étapes lentes, sans additionner les étapes imbriquées |
| `server_error_detected` | Exception serveur détectée par Next, route normalisée et méthode | Diagnostic complémentaire : ne pas additionner aux requêtes HTTP en erreur |

Environnement, version Git et région sont ajoutés sous forme bornée. Pas
d’utilisateur, compte, jeu, joueur, IP, cookie, corps de requête, contenu de
formulaire, URL libre, query, pile d’erreur ou message d’exception dans ces
mesures. Les spans OpenTelemetry bruts ne sont jamais exportés ; leurs IDs
ne sont pas attachés aux nouveaux logs. Les anciens logs ciblés de sauvegarde
conservent leur contrat documenté plus bas, distinct des mesures nouvelles.

### Couverture et limites

Les spans HTTP racines de Next.js couvrent les API et les pages servies par le
runtime Node. Un inventaire fermé des 81 routes API est contrôlé par les tests ;
une nouvelle route non recensée fait échouer ce contrôle. Les chemins inconnus
sont regroupés, les IDs remplacés par des placeholders et les ressources
statiques exclues. Les étapes hors contexte HTTP, dont les pré-rendus de build,
ne sont pas comptées. Les réponses métier et signatures de webhook restent
inchangées. Les redirections ne sont pas classées comme pannes serveur.

Les requêtes servies uniquement par le CDN, ressources statiques, tâches hors
HTTP, clics locaux, peinture, LCP et disponibilité des contrôles navigateur ne
sont pas mesurés ici. Une requête RSC peut être un préchargement ; `prefetch`
reste `unknown` si Next n’expose pas le signal. Les compteurs incluent aussi
robots, retries et tests sur l’hôte de production : ce ne sont pas des personnes
ou des interactions uniques. `instanceFirstRequest` ne mesure pas le temps
d’un démarrage à froid avant le chargement du SDK.

La mesure est exhaustive au point de capture pour les requêtes éligibles,
mais sa livraison reste best effort : interruption de fonction, saturation de
file, quota ou panne du fournisseur peuvent perdre des logs. Une absence de
mesure n’est pas un temps nul ou une preuve d’absence de trafic.

### Activation avant déploiement

Le code journalise les nouvelles mesures en production sauf
`OKADO_OPERATIONAL_LOGS_ENABLED=false`. Leur conservation hors de la courte
rétention Vercel nécessite **les variables serveur** :

```dotenv
POSTHOG_OTEL_LOGS_ENABLED=true
POSTHOG_OTEL_LOGS_TOKEN=<token d’ingestion vérifié pour 212872>
POSTHOG_OTEL_LOGS_HOST=https://eu.i.posthog.com
POSTHOG_OTEL_LOGS_SERVICE_NAME=okado-web
```

Ne pas utiliser une clé personnelle comme token d’ingestion. Le contrôle local
`npm run check:operational-telemetry -w @okado/web-app`, avec la configuration
cible fournie de façon privée et `POSTHOG_PERSONAL_API_KEY`/`POSTHOG_PROJECT_ID`
locaux, vérifie en lecture seule le token canonique de 212872 EU sans le
réimprimer. La clé personnelle n’est pas requise dans l’application de production.

La configuration n’est pas une preuve de réception. Vérifier ensuite
`operational_tracing_status` avec `active:true`, `exportConfigured:true`, puis
l’arrivée réelle de `http_request_completed` dans **Logs du projet 212872**.
Si un autre fournisseur de traces est déjà enregistré, le code n’écrase pas
celui-ci et annonce `active:false` : analyser le conflit avant de revendiquer
la couverture. Une panne d’export n’interrompt jamais une action métier ;
`server_telemetry_export_failed` avertit au plus une fois par minute sans
réimprimer l’erreur ou la configuration privée.

### Conservation, rapports et volume

PostHog Logs annonce **14 jours par défaut**, indépendamment des rétentions
des événements analytics et replays. La réponse API projet 212872 vérifiée le
29 octobre ne contient aucun réglage de rétention Logs. Confirmer la valeur
effective du service/source dans la cible avant activation. Aucun allongement
payant ni changement de forfait n’est inclus : ces logs permettent une analyse
glissante sur 7/14 jours selon couverture réelle, pas une promesse d’historique
sur 28 jours. Un historique plus long nécessite une décision d’archivage ou
d’agrégation avant expiration.

Dans Logs, sélectionner service `okado-web`, environnement `production`,
canal `operational`, puis le nom d’événement et la route voulue. Comparer des
versions/régions et types de requête comparables. Garder distincts les statuts,
succès/erreurs, préchargements et étapes. Exporter la période explicitement
bornée, puis le rapport local accepte les JSONL applicatifs, le wrapper Vercel
`message` ou les attributs plats/OTLP :

```powershell
Get-Content -LiteralPath <export-prive.jsonl> | npm run report:operational-telemetry -w @okado/web-app
```

Il calcule effectif, moyenne, p50/p75/p95 par route/méthode/statut/version/région,
et les étapes séparément. Les percentiles sont calculés sur les durées brutes
par rang le plus proche, comme le rapport de préparation de partie existant.
Ils ne sont pas une moyenne de percentiles journaliers. Les lignes ignorées
sont comptées, les mesures sans durée restent nulles et une extraction tronquée
ne devient pas une population complète.

Une seule mesure HTTP est émise par span racine, sans export des spans internes.
Le SDK limite la file à 1024 logs, les lots à 128, l’export HTTP à 1500 ms et le
flush à 2000 ms. L’export est planifié après réponse ; un callback du SDK hors
contexte Next utilise le cycle de vie Vercel en repli. Suivre le volume/quota
du fournisseur ; aucun plafond payant ou achat n’est configuré ici.

Références : [journalisation CNIL](https://www.cnil.fr/fr/securite-tracer-les-operations),
[instrumentation Next](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation),
[rétention Logs](https://posthog.com/docs/logs/pricing).

## Décision issue #102

Okado conserve ses signaux existants (logs runtime Vercel, événements métier `business_logs` et analytics PostHog) et ajoute une instrumentation ciblée des erreurs de sauvegarde de campagne. Les erreurs serveur de `POST /api/campaigns/setup` et l'échec correspondant côté wizard peuvent être envoyés à PostHog Logs au format OpenTelemetry (OTLP).

Le choix est volontairement ciblé : il évite de recopier automatiquement toute la sortie console, limite le volume et réduit le risque de doublons avec les logs Vercel. Les traces distribuées et l'autocapture des logs console ne sont pas activés dans cette issue. Depuis #508, le suivi produit et les captures d'erreur côté navigateur attendent le consentement de mesure ; le refus et le retrait les bloquent. L'export opérationnel serveur décrit ci-dessous conserve sa configuration propre, désactivée par défaut.

## Configuration

Les variables suivantes sont optionnelles et doivent être définies dans l'environnement d'exécution, jamais commitées :

- `POSTHOG_OTEL_LOGS_ENABLED=true` active l'export serveur ; la valeur par défaut est désactivée.
- `POSTHOG_OTEL_LOGS_TOKEN=phc_...` est le project token PostHog, distinct d'une clé personnelle `phx_...`.
- `POSTHOG_OTEL_LOGS_HOST=https://eu.i.posthog.com` est l'hôte PostHog EU par défaut. L'export utilise `/i/v1/logs`.
- `POSTHOG_OTEL_LOGS_SERVICE_NAME=okado-web` permet de distinguer le service dans PostHog Logs.
- `NEXT_PUBLIC_VERCEL_ENV` renseigne l'environnement des captures navigateur autorisées (`local` en l'absence de valeur).

Le projet Vercel actuellement lié est sur le plan Hobby : les Vercel Drains ne sont donc pas une dépendance de cette solution. L'export est direct vers PostHog via OTLP. Les quotas, la rétention et le coût exacts de PostHog Logs doivent être confirmés dans le workspace PostHog du propriétaire avant activation en production.

Références : [installation PostHog Logs pour Next.js](https://posthog.com/docs/logs/installation/nextjs.md), [installation OpenTelemetry de PostHog](https://posthog.com/docs/logs/installation), [OpenTelemetry Next.js](https://nextjs.org/docs/app/guides/instrumentation), [Vercel Drains](https://vercel.com/docs/drains).

## Événements et confidentialité

L'événement serveur `campaign_setup_failed` contient uniquement : route, méthode HTTP, statut, mode de création, type de jeu, identifiant de campagne éventuel, identifiants marchand/utilisateur hachés et identifiant de requête fourni par la plateforme. Le message d'erreur est tronqué et nettoyé des adresses e-mail, tokens Bearer et tokens PostHog.

L'événement navigateur utilise le même nom et ne transmet pas le message brut de l'erreur. Aucun e-mail, PIN, contenu de formulaire, secret ou payload de campagne n'est envoyé par cette instrumentation. L'activation est limitée aux erreurs ; aucun échantillonnage automatique supplémentaire n'est nécessaire à ce stade. Si le volume augmente, le périmètre ou le taux d'échantillonnage devra être ajusté avec les limites du workspace PostHog.

## Mesure de latence des sauvegardes (#280)

La route `POST /api/campaigns/setup` émet un événement structuré `campaign_setup_timing` dans les logs runtime Vercel après chaque requête authentifiée. Il contient le mode création/modification, le type de jeu, les nombres d'actions et de lots, les durées d'authentification, d'analyse du formulaire, de sauvegarde et du total. Quand elles sont présentes, la taille de requête et la durée de sérialisation navigateur sont également consignées. La réponse fournit les mêmes durées principales dans `Server-Timing`, visibles dans les outils réseau du navigateur.

La couche de persistance émet `campaign_setup_storage_timing` pour distinguer les lectures de contrôle, l'écriture atomique et l'audit. Ces mesures permettent de calculer p50/p95 et de séparer les cas création/modification, roue/ticket et tailles de configuration. Aucun identifiant de marchand, identifiant de jeu, libellé, URL configurée, adresse, PIN, jeton ou texte libre n'est ajouté à ces événements. Les compteurs et tailles sont bornés ou numériques ; ne jamais compléter ces journaux avec le corps de la requête ou les valeurs de formulaire.

## Vérification locale

1. Copier les variables nécessaires dans un fichier `.env.local` non commité, avec un project token PostHog de test si l'export doit être vérifié.
2. Démarrer l'application et provoquer un échec contrôlé de sauvegarde du wizard.
3. Vérifier que l'interface affiche toujours son message d'erreur et que la requête conserve son statut attendu.
4. Avec `POSTHOG_OTEL_LOGS_ENABLED=true`, rechercher dans PostHog Logs le service `okado-web` et l'événement `campaign_setup_failed`.
5. Sans token ou avec `POSTHOG_OTEL_LOGS_ENABLED=false`, vérifier que l'application fonctionne normalement et que le diagnostic reste disponible dans les logs runtime Vercel.

## Retour arrière

Pour désactiver immédiatement l'export, positionner `POSTHOG_OTEL_LOGS_ENABLED=false` ou retirer les variables `POSTHOG_OTEL_LOGS_*`, puis redéployer. L'instrumentation ne participe pas à la réponse métier : une indisponibilité de PostHog ne bloque ni la sauvegarde ni l'affichage des erreurs. La suppression des dépendances et du code de cette PR constitue le retour arrière complet.

## Limites connues

Cette instrumentation ne remplace pas les logs runtime Vercel ni les logs métier consultables dans l'application. Elle ne capture pas les erreurs d'autres routes tant qu'elles ne sont pas ajoutées explicitement. L'accès aux logs et leur rétention restent soumis au plan et aux réglages du workspace PostHog.
