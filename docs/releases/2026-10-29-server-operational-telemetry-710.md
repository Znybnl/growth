# Télémétrie opérationnelle serveur — #710

## Résultat livré

Les appels API et pages exécutés par Next.js disposent de mesures techniques
indépendantes du consentement analytics : route normalisée, méthode, statut,
durée serveur, type API/document/RSC, environnement, version et région. Les
étapes Auth/workspace/données existantes et les erreurs serveur Next sont aussi
journalisées. L’inventaire des 81 routes API est testé ; les chemins inconnus
restent regroupés sans exporter la valeur reçue.

Il n’y a pas de réécriture des 81 handlers, modification de réponse, lecture de
corps, cookie ou session. Le SDK observe les spans HTTP racines de Next ; les
spans bruts ne sont jamais exportés. Les nouveaux logs suppriment aussi les IDs
de trace/span et toute identité, IP, URL complète, paramètre, contenu libre ou
message d’erreur. Le filtre est appliqué à la capture et de nouveau au sink.

Le pipeline opérationnel existant console Vercel + OTLP PostHog Logs est
réutilisé. Le logger est partagé dans le processus. L’export est exécuté hors
réponse avec file, lots et délais bornés, sans refaire l’action métier en cas
d’échec. Un message statique et limité avertit des défauts d’export. Les seuls
hôtes acceptés sont l’ingestion EU et le collecteur de test en loopback.

Un outil de rapport JSONL calcule volumes et distributions par route/statut/
méthode/version/région ; les étapes sont séparées. Il ne transforme pas des
requêtes techniques en utilisateurs uniques, visites humaines ou clics.

## Périmètre durable

La décision explicite du propriétaire est inscrite dans les règles métier et
le registre des traitements. La notice publique de confidentialité explique la
différence entre journalisation d’exploitation et mesure d’audience consentie.
Les replays, cookies et événements marketing ne sont pas réactivés par ce code.
Les anciens logs d’erreur de sauvegarde gardent leur contrat propre.

Les requêtes purement CDN, ressources statiques, actions locales navigateur,
FCP/LCP et affichage complet ne sont pas observés par ce dispositif. Next
n’expose pas toujours le préchargement : le champ reste alors inconnu. Le flag
de première requête n’est pas une mesure complète de cold start. Les métriques
de requête et d’étape ne doivent pas être additionnées.

## Configuration requise avant production

**Aucune migration SQL. Aucun nouveau fournisseur ni forfait Vercel requis.**
La conservation distante nécessite l’activation de `POSTHOG_OTEL_LOGS_ENABLED`
et un `POSTHOG_OTEL_LOGS_TOKEN` d’ingestion **vérifié pour 212872 EU**, avec
`POSTHOG_OTEL_LOGS_HOST=https://eu.i.posthog.com`. La clé personnelle privée
sert uniquement au contrôle local, jamais à l’ingestion ou au client.

La configuration locale inspectée ne contient pas de token OTLP ni de preuve
d’activation : ce développement n’est pas présenté comme une collecte de
production déjà active. Le contrôle `check:operational-telemetry` vérifie la
configuration fournie en lecture seule sans exposer de secret. Après livraison,
contrôler `active:true`/`exportConfigured:true` et l’arrivée effective des logs.
Un fournisseur de traces déjà installé n’est pas écrasé silencieusement.

PostHog Logs conserve 14 jours par défaut ; sa rétention actuelle n’est pas
exposée dans la réponse projet contrôlée. **Aucun historique de 28 jours n’est
promis et aucune option de rétention payante n’est activée.** Une décision
séparée d’archivage ou d’agrégation avant expiration est nécessaire pour couvrir
des périodes plus longues. Les résultats manquants ne sont pas reconstitués.

## Vérifications

Tests dédiés du schéma, du SDK réel, du cycle de vie et du rapport ;
non-régressions des lectures/session, du consentement, des campagnes admin,
du QR de test et des signatures webhook. Smoke sur le serveur compilé avec
collecteur local et refus de cookies. Lint et builds des deux applications,
audits de dépendances, contrôle des sources et captures de notice.

Résultats : 14 tests dédiés et 82 non-régressions réussis, trois contrôles
visuels réussis et captures inspectées. Le smoke compilé valide les six
requêtes initiales (200/401/404/500/405 et redirection), une étape, l’absence
de données privées/trace IDs, la réponse préservée malgré le collecteur en
échec et l’avertissement d’export visible. Le vrai transport OTLP est aussi
testé avec deux flush concurrents et des logs arrivant pendant le premier.
Lint des deux applications : aucune erreur, quatre avertissements existants
côté SaaS. Builds web et landing réussis ; audit de production sans vulnérabilité,
audit complet conforme à l’exception faible de développement déjà documentée.
YAML, sources et diff contrôlés.
Les contrôles locaux n’effectuent aucune requête métier, écriture de base,
connexion PostHog d’ingestion ou envoi d’e-mail réel.

## Retour arrière

`OKADO_OPERATIONAL_LOGS_ENABLED=false` arrête les nouvelles mesures. Les logs
opérationnels historiques de sauvegarde restent distincts ;
`POSTHOG_OTEL_LOGS_ENABLED=false` coupe tout export OTLP de ce pipeline. Un
revert restaure le fournisseur précédent et enlève les nouvelles dépendances.
Aucune modification de données métier ou permission n’est à annuler.

[Configuration, analyse des logs et limites](../OBSERVABILITY.md).
