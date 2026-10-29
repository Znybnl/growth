# Durées de chargement de l’application — audit #708

Analyse en lecture seule du 29 octobre 2026. Périmètre : `app.okado.app`,
PostHog **212872 / EU**, projet Vercel `growth` en production. Aucun paramètre,
consentement, secret, abonnement ou événement de collecte n’a été modifié.

## Conclusion

**Les données actuelles ne permettent pas de calculer les durées moyennes
d’affichage par page sur les derniers jours ou semaines.** La semaine du
22 au 28 octobre possède des vues, mais aucune mesure navigateur. Cela ne
signifie pas que les pages chargent instantanément ni qu’elles sont lentes.

Les mesures historiques du 1er au 15 octobre donnent des points de comparaison
descriptifs, avec de très petits effectifs. Elles précèdent plusieurs
optimisations : ne pas les présenter comme la performance actuelle.

Les logs techniques du 29 octobre montrent environ deux secondes de traitement
serveur pour quelques requêtes Campagnes/Résultats. Ce ne sont ni des moyennes
hebdomadaires ni des durées d’affichage chez les utilisateurs.

## Périmètre et méthode

- Quatre semaines complètes : 1–7, 8–14, 15–21 et 22–28 octobre ; agrégat 1–28.
  Journées civiles Europe/Paris, comme Europe/Berlin à ces dates. Le changement
  d’heure du 25 octobre est pris en compte : début global `2026-09-30T22:00Z`,
  fin exclusive `2026-10-28T23:00Z`. Le 29 est isolé et partiel.
- Vérification effective du projet par l’API privée EU, ID 212872. Le nom
  retourné est « Default project » ; seul l’ID est déterminant. Le connecteur
  ne voit que 272039 : aucune donnée de ce projet n’a été utilisée.
- Les événements/propriétés ont été découverts avant agrégation. Le catalogue
  de métriques du projet est vide : calcul exploratoire, non canonique.
- Hôte exact `app.okado.app`. Environnement `production` ou absent pour
  l’historique antérieur au 16 octobre ; localhost et le site vitrine exclus.
- Familles de routes fermées issues du registre de l’application. Les IDs
  ne sont jamais retournés. Les aperçus reconnus par `pageMode`, `preview=1`
  ou `preview-embed` sont exclus des tableaux par période. Les anciennes
  prévisualisations sans marqueur reconnaissable ne sont pas reconstituables.
- Moyenne arithmétique, médiane, p75 et p95 calculés directement sur les valeurs
  présentes, en millisecondes. Les valeurs absentes restent nulles ; aucune
  moyenne de moyennes ni agrégation de percentiles hebdomadaires.
- Contrôle de doublons : dans les événements historiques de l’hôte app, les
  141 valeurs LCP correspondent à 141 pageviews distinctes, et les 228 FCP à
  228 pageviews distinctes. Après exclusions, 114 LCP et 175 FCP subsistent.
  Un événement vitals peut contenir plusieurs métriques : 347 événements ne
  signifient pas 347 LCP. Les pageviews ne sont pas le dénominateur d’un taux
  de couverture fiable, notamment à cause des navigations SPA et du consentement.
- Les requêtes et tableaux ne sont pas tronqués. Aucune identité utilisateur,
  adresse e-mail, URL dynamique, session ou clé n’est exportée.
- Les comptes administrateur et les tests effectués sur l’hôte de production
  ne sont pas isolés rétrospectivement : ces mesures ne représentent pas
  exclusivement les marchands.

Reproduction : exécuter les requêtes de [queries.sql](queries.sql) dans le SQL
editor du projet 212872 EU, sans le point-virgule terminal si l’interface le
refuse. Résultats agrégés : [posthog-aggregates.json](posthog-aggregates.json).
Le détail journalier de découverte y inclut les aperçus, explicitement distinct
des tableaux par période filtrés. Les limites de période sont fixes afin de
reproduire cet audit ; adapter les dates pour une nouvelle campagne de mesure.

## Durées navigateur historiques disponibles

LCP = apparition du plus grand contenu visible ; FCP = premier contenu peint.
**Aucun des deux ne mesure la disponibilité complète des données et contrôles
après chaque navigation interne.** Ils ne mesurent pas le temps passé sur la page.

Agrégation des valeurs disponibles pendant le 1–28 octobre, toutes datées du
1er au 15. Effectifs trop faibles pour une conclusion générale, en particulier
les percentiles élevés. Mélange d’appareils/réseaux et visites consentantes.

| Écran | LCP moyen | n | Médiane LCP | p75 LCP | p95 LCP | FCP moyen | n FCP |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Accueil | 4,823 s | 9 | 4,328 s | 4,692 s | 9,296 s | 3,460 s | 7 |
| Campagnes | 3,278 s | 7 | 3,228 s | 3,832 s | 5,428 s | 2,231 s | 7 |
| Résultats | indisponible | 0 | — | — | — | 3,743 s | 3 |
| Mon compte | 2,713 s | 6 | 2,760 s | 3,048 s | 3,184 s | 2,603 s | 8 |

L’effectif FCP diffère de l’effectif LCP : ne pas soustraire les moyennes pour
calculer un temps de chargement supplémentaire. Les percentiles exacts utilisés
par PostHog ne sont pas interpolés ; avec deux valeurs, la médiane peut être
la valeur supérieure. La [liste de toutes les routes](historical-table.md)
inclut connexion, onboarding, administration, affiche, wizard et page de jeu.
Les routes sans métrique ont « — », pas une estimation inventée.

### Moyenne LCP par semaine, avec effectif

| Écran | 1–7 octobre | 8–14 octobre | 15–21 octobre | 22–28 octobre |
| --- | ---: | ---: | ---: | ---: |
| Accueil | 4,942 s (7) | 4,406 s (2) | — (0) | — (0) |
| Campagnes | 3,156 s (5) | 3,832 s (1) | 3,332 s (1, le 15) | — (0) |
| Résultats | — (0) | — (0) | — (0) | — (0) |
| Mon compte | 2,822 s (4) | 2,496 s (2) | — (0) | — (0) |

Aucune comparaison d’amélioration/régression ne peut être établie entre les
deux dernières semaines. La seule valeur de la troisième semaine est antérieure
à l’arrêt de collecte, pas une moyenne représentative du 15–21.

## Pourquoi l’historique récent manque

1. Dernier `$web_vitals` de l’hôte application : **15 octobre, 19:17:24 CEST**
   (`17:17:24Z`). Le SDK est explicitement configuré avec
   `capture_performance: false` dans `consent-managed-analytics.ts`.
   Cette option a été introduite par le commit `598b4a3` / PR #513, fusionné
   le 15 octobre à 22:29 CEST. La concordance explique l’arrêt ; ce n’est pas
   seulement une baisse de trafic ou une absence de consentement : les
   pageviews consentantes continuent ensuite sans vitals.
2. Semaine du 22–28 : **280 pageviews de l’hôte app, zéro vitals**. Par jour :
   22 : 6 vues ; 23 : 103 ; 24 : 30 ; 25 : 13 ; 26 : 74 ; 27 : 10 ; 28 : 44.
   Aucune durée moyenne navigateur n’est calculable pour ces journées.
3. **235/280 vues (83,9 %) sont `/other`** dans cette semaine. Les routes
   marchandes étaient regroupées par l’ancien filtre. #691/#693 a rétabli le
   classement par familles de routes. Le 29, dans la lecture partielle arrêtée
   à 17:12 CET, il reste 1 vue générique sur 64. Cela ne recrée pas l’historique.
4. `$prev_pageview_duration` est une durée de consultation, pas de chargement.
   `draw_preparation_timing`, les imports et les téléchargements chronométrés
   mesurent d’autres opérations. Aucune de ces valeurs n’a servi de substitut.
5. Les métriques navigateur doivent rester soumises au consentement. Les
   visiteurs non consentants, bloqueurs, sessions interrompues et mesures
   absentes ne sont pas représentés ; impossible d’extrapoler à tous les clients.

## Logs serveur disponibles

Les quatre fonctions de page principales sont instrumentées par
`measureServerStage` : `page.home`, `page.campaigns`, `page.results`,
`page.account`. Les étapes Auth et données sont aussi chronométrées.

La lecture Vercel sur sept jours renvoie HTTP 400 : rétention insuffisante du
forfait Hobby. Une lecture de 59 minutes fonctionne. L’API de découverte
Observability renvoie 404 dans cet accès ; aucune série historique de métriques
n’a pu être vérifiée par cette voie. Ne pas en déduire qu’aucun service Vercel
ne pourrait fournir de métriques avec une autre configuration.

Instantané réellement obtenu le 29 octobre, **16:08:28–17:07:28 CET** :

| Écran / stage | n succès | Moyenne serveur | Valeurs |
| --- | ---: | ---: | --- |
| Accueil / `page.home` | 0 | indisponible | aucune ligne dans la fenêtre |
| Campagnes / `page.campaigns` | 3 | 1,980 s | 2,2875 ; 1,9503 ; 1,7011 s |
| Résultats / `page.results` | 1 | 2,366 s | 2,366 s |
| Mon compte / `page.account` | 0 | indisponible | aucune ligne dans la fenêtre |

Ce sont des durées de fonction de page et de lectures attendues, sans réseau
client, peinture, hydratation ni garantie de fin des composants descendants.
Les requêtes peuvent provenir d’un préchargement : ce n’est pas un nombre de
visites humaines. Tous les échantillons retenus ont `success:true` ; les
redirections ou interruptions Next ne doivent pas être classées mécaniquement
en pannes. Les étapes imbriquées ne doivent pas être additionnées.

Le code envoie `okado.performance` à la console Vercel uniquement. L’export
opérationnel OTLP existant traite les échecs de sauvegarde ; il n’archive pas
ces durées. Il n’existe donc pas de conservation hebdomadaire démontrée pour
ces traces. Les lignes brutes, IDs de requête et chemins dynamiques ne sont
pas publiés dans cet audit.

## Recommandations, par priorité

| Priorité | Évolution proposée | Vérification attendue |
| --- | --- | --- |
| P0 | Rétablir une collecte ciblée FCP/LCP après consentement, avec route fermée, environnement, version de livraison et appareil ; exclure URL, IDs et payloads libres. Auditer aussi `before_send` et l’attribution à la navigation initiale, pas seulement basculer un booléen. | Acceptation, refus, retrait, navigation et zéro donnée privée ; arrivée effective dans 212872. |
| P0 | Mesurer séparément les transitions internes : départ de navigation → données et contrôles principaux disponibles, après peinture. Distinguer entrée document, navigation interne, changement de site et préchargement. | Accueil, Campagnes, Résultats, Compte et wizard ; succès, erreur, annulation, onglet masqué ; pas de durée négative ou d’émission en double. |
| P0 | Conserver des agrégats techniques serveur par stage/route/version, succès et jour dans le dispositif opérationnel existant, sans identité et sans dépendance à un forfait Vercel supérieur. Définir volume, rétention et traitement des échecs avant activation. | Reconstruction des moyennes et percentiles sur 7/28 jours ; vérifier les durées brutes avant d’agréger, ne pas additionner les percentiles. |
| P1 | Ajouter un tableau de suivi par page : n, moyenne, médiane, p75/p95, appareil et période, plus un indicateur de fraîcheur de la collecte. | Distinguer absence de trafic, vues sans mesures et mesures présentes ; avertir lorsque les vues continuent mais les mesures s’arrêtent. |
| P1 | Reprofiler les pages avec la nouvelle collecte, puis optimiser le chemin serveur Auth/données et les ressources critiques selon les résultats. | Comparaison de cohortes et versions comparables, pas déduction de gains à partir de cet ancien échantillon. |

Ces recommandations sont un plan de développement à valider. Cet audit ne
réactive aucun tracking, n’étend pas les logs et ne déclenche aucune dépense.
Les cibles éventuelles de délai doivent distinguer affichage initial et
navigation interne ; un score Lighthouse local ne remplace pas cette collecte.

## Contrôles et sources

- Requêtes API privées en lecture seule, projet/hôte vérifiés, bornes UTC et
  changement d’heure contrôlés, quantiles calculés sur les valeurs, pas sur
  des agrégats. Recalcul des sommes hebdomadaires : 270 + 134 + 172 + 280 =
  856 vues après exclusions ; 75 + 37 + 2 + 0 = 114 LCP.
- Rapport documentaire uniquement : aucun changement d’application, migration,
  dépendance ou déploiement. Pas de nouveau test UI nécessaire.
- [Définition des vitals](https://posthog.com/docs/web-analytics/web-vitals),
  [diagnostic des vitals manquants](https://posthog.com/docs/health-checks/web-vitals),
  [temps passé sur la page](https://posthog.com/tutorials/time-on-page).
- [Optimisations et mesures HAR #500](../../releases/2026-10-14-page-performance-500.md),
  [audit de couverture #691](../../releases/2026-10-29-tracking-coverage-691.md),
  [observabilité existante](../../OBSERVABILITY.md).
