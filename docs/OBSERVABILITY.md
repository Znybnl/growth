# Observabilité applicative

## Décision issue #102

Okado conserve ses signaux existants (logs runtime Vercel, événements métier `business_logs` et analytics PostHog) et ajoute une instrumentation ciblée des erreurs de sauvegarde de campagne. Les erreurs serveur de `POST /api/campaigns/setup` et l'échec correspondant côté wizard peuvent être envoyés à PostHog Logs au format OpenTelemetry (OTLP).

Le choix est volontairement ciblé : il évite de recopier automatiquement toute la sortie console, limite le volume et réduit le risque de doublons avec les logs Vercel. Les traces distribuées et l'autocapture des logs console ne sont pas activés dans cette issue. Le suivi analytics PostHog côté navigateur reste actif.

## Configuration

Les variables suivantes sont optionnelles et doivent être définies dans l'environnement d'exécution, jamais commitées :

- `POSTHOG_OTEL_LOGS_ENABLED=true` active l'export serveur ; la valeur par défaut est désactivée.
- `POSTHOG_OTEL_LOGS_TOKEN=phc_...` est le project token PostHog, distinct d'une clé personnelle `phx_...`.
- `POSTHOG_OTEL_LOGS_HOST=https://eu.i.posthog.com` est l'hôte PostHog EU par défaut. L'export utilise `/i/v1/logs`.
- `POSTHOG_OTEL_LOGS_SERVICE_NAME=okado-web` permet de distinguer le service dans PostHog Logs.
- `NEXT_PUBLIC_APP_ENV` renseigne l'environnement des logs PostHog côté navigateur.

Le projet Vercel actuellement lié est sur le plan Hobby : les Vercel Drains ne sont donc pas une dépendance de cette solution. L'export est direct vers PostHog via OTLP. Les quotas, la rétention et le coût exacts de PostHog Logs doivent être confirmés dans le workspace PostHog du propriétaire avant activation en production.

Références : [installation PostHog Logs pour Next.js](https://posthog.com/docs/logs/installation/nextjs.md), [installation OpenTelemetry de PostHog](https://posthog.com/docs/logs/installation), [OpenTelemetry Next.js](https://nextjs.org/docs/app/guides/instrumentation), [Vercel Drains](https://vercel.com/docs/drains).

## Événements et confidentialité

L'événement serveur `campaign_setup_failed` contient uniquement : route, méthode HTTP, statut, mode de création, type de jeu, identifiant de campagne éventuel, identifiants marchand/utilisateur hachés et identifiant de requête fourni par la plateforme. Le message d'erreur est tronqué et nettoyé des adresses e-mail, tokens Bearer et tokens PostHog.

L'événement navigateur utilise le même nom et ne transmet pas le message brut de l'erreur. Aucun e-mail, PIN, contenu de formulaire, secret ou payload de campagne n'est envoyé par cette instrumentation. L'activation est limitée aux erreurs ; aucun échantillonnage automatique supplémentaire n'est nécessaire à ce stade. Si le volume augmente, le périmètre ou le taux d'échantillonnage devra être ajusté avec les limites du workspace PostHog.

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
