# Acquisition et activation — contrôle complémentaire #507

## Périmètre et état réel

Contrôle en lecture seule du **25 octobre 2026**, exclusivement PostHog
**212872 / EU**, identité vérifiée par API privée avant les requêtes, fuseau UTC.
Le catalogue interrogé ne comporte aucune métrique gouvernée : les chiffres
ci-dessous suivent les définitions documentées et les cinq rapports existants,
sans prétendre à une métrique certifiée. Aucun rapport, cohorte ou événement
modifié ; aucune collecte, inscription, partie, campagne ou émission de test en
production. Le projet 272039 n'a pas été consulté.

La [PR #614](https://github.com/Znybnl/growth/pull/614) est bien fusionnée depuis
le 21 octobre à 16:50:28 UTC, commit `5b6fd8c`. L'ancien commentaire de #507 qui
la décrit non fusionnée est historique. Ce contrôle du merge n'est pas une
preuve d'une heure exacte de mise en production ; aucune coupure analytique
n'est inventée depuis la seule date de fusion.

## Baseline PostHog actualisée

Instantané : **2026-10-25 22:29:33.921 UTC**. Totaux sur les 28 jours du
27 septembre au 25 octobre, mêmes heures. Filtres : production,
consentVersion=2026-10-15, trackingVersion=v1, exclusion interne existante.
Le champ « pages vues » couvre les routes des deux applications, **pas seulement
les pages du site vitrine**, et ne désigne pas des visiteurs uniques.

| Événement | Occurrences |
|---|---:|
| `$pageview` | 365 |
| `marketing_cta_clicked` (tous types, pas seulement essai) | 29 |
| `marketing_demo_started` | 5 |
| `marketing_demo_completed` | 5 |
| `signup_started` | 0 |
| `signup_completed` | 0 |
| `onboarding_completed` | 2 |
| `campaign_published` | 17 |

Ces totaux ne forment pas une séquence : 17 publications ne signifient ni
17 nouveaux marchands ni 17 premières activations acquises depuis le site.
Le consentement limite la couverture ; zéro inscription **observée dans ces
filtres** ne prouve pas qu'aucun compte n'a été créé dans l'application.

### Funnels natifs, personnes uniques

- [Acquisition → publication](https://eu.posthog.com/project/212872/insights/0gtandAv),
  90 jours d'observation, fenêtre de conversion de 30 jours :
  **3 → 0 → 0 → 0 → 0**, essai réel → inscription commencée → inscription
  terminée → onboarding → publication. Le taux constaté à cet instant est 0/3,
  mais **aucun taux final ni abandon définitif** n'est conclu : le script
  n'établit pas la maturité individuelle des cohortes. Ne pas utiliser 29/365.
- [Inscription → publication](https://eu.posthog.com/project/212872/insights/awBx9gfa) :
  **0 entrant**, taux **N/D**, pas 0 %.
- [Démo](https://eu.posthog.com/project/212872/insights/kLONjXG3),
  28 jours d'observation, fenêtre 30 minutes : **2 personnes entrées, 2 ayant
  confirmé dans la séquence**. Ce ne sont pas cinq personnes ni une preuve
  d'amélioration commerciale ; l'échantillon est trop petit pour généraliser.
- [Pages](https://eu.posthog.com/project/212872/insights/qXHjKxpv) et
  [sources UTM des clics essai](https://eu.posthog.com/project/212872/insights/VeBB7gA1) :
  définitions relues, requêtes exécutées. Les valeurs libres de breakdown ne
  sont pas exportées par le script. Source absente ≠ trafic direct.

Le premier parcours organique consenti **complet jusqu'à la publication** n'est
donc pas vérifié : il ne figure pas dans le funnel actuel. Réception réelle de
démo et d'activité ne vaut pas preuve d'attribution inter-sous-domaines jusqu'à
une inscription. Aucun rapprochement historique ou affaiblissement des filtres.

## Améliorations du script de contrôle

`node scripts/audit-conversion.mjs`, toujours en lecture seule par défaut :

- valide explicitement le CTA `start_trial`, les cinq étapes obligatoires,
  leur ordre et la fenêtre de 30 jours, sans agrégation par groupe ni exclusions
  ajoutées silencieusement ;
- échoue si un rapport obligatoire manque ;
- retourne les résumés des deux autres funnels, auparavant exécutés puis jetés ;
- projette uniquement les événements attendus et nombres : aucun tableau natif
  `people`, identifiant ou propriété libre, même si l'API en fournit à l'avenir ;
- distingue une requête terminée sans entrant (`[]`, résultat natif observé)
  d'une réponse absente, échouée ou encore en cours ;
- garde le taux final à N/D tant que la maturité n'est pas établie ;
- ne journalise plus le détail libre d'une erreur API.

Ces contrôles ont des tests hors réseau ajoutés à la CI. Aucun nouvel appel
d'ingestion, fournisseur, métrique certifiée ou tableau de bord n'est créé.
Référence de définition : [conversion PostHog](https://posthog.com/docs/data-warehouse/pocket-guide/conversion-metrics).

## SEO public, GSC et Bing

Contrôle HTTP du **25 octobre à 22:27:43 UTC** : sitemap en 200, **57 URL**
dont **34 articles**, toutes les 57 URL en 200. Cela ne prouve ni découverte
par Google/Bing, ni indexation, ni trafic. L'ancien total 53/30 est daté du 21.

Les accès navigateur et ordinateur ont tous deux échoué dès l'initialisation :
`failed to write kernel assets` / chemin introuvable. Aucune console GSC/Bing n'a
été consultée pendant ce contrôle. Ce n'est pas une preuve que les droits du
propriétaire ou les comptes ont changé. Les derniers chiffres GSC/Bing du
21 octobre restent des historiques, **pas des valeurs réactualisées**.
Aucune nouvelle soumission de sitemap ni demande d'indexation effectuée.

### Restes à traiter, issue maintenue ouverte

1. Constater un vrai parcours consenti site → inscription → première publication,
   sans fabriquer d'événements ni prendre un compte ancien pour une acquisition.
2. Lire les rapports GSC à nouveau : fenêtre disponible, filtres vitrine/blog,
   impressions/clics/requêtes et indexation agrégée. Ne pas annoncer zéro en cas
   d'indisponibilité.
3. Reprendre Bing : état et dernière lecture du sitemap existant, indexation et
   performance. Ne pas transformer les 57 URL HTTP en 57 URL reconnues par Bing.

Il n'y a ni attente d'autorisation pour l'API PostHog (elle fonctionne), ni
nouveau secret demandé. La reprise des consoles nécessite un accès navigateur
opérationnel ou des exports GSC/Bing récents fournis par le propriétaire.
Pas d'automation ou veille récurrente créée.

## Validation et retour arrière

- Tests purs du rapport : **7 réussis**, hors réseau, données sensibles
  synthétiques et réponses absentes/en cours/vides/incohérentes.
- Consentement existant : **10 tests réussis**, avec les deux applications.
- Conversion navigateur : **14 tests réussis**, desktop et mobile, vrai SDK et
  réseau intercepté ; aucune inscription ou capture réelle.
- Lint/build des deux applications : réussis, quatre avertissements SaaS
  préexistants ; builds avec token fixture, pas de secret de production.
- Script réel relu plusieurs fois en lecture seule : résultats cohérents.
- Syntaxe des scripts, YAML et contrôle source vérifiés avant PR.

Total : **31 tests automatisés réussis**. Aucun écran ni code applicatif de capture modifié.
Retour arrière : revert du script/helpers/CI/docs uniquement, sans migration
SQL ou correction de données. Merge soumis à validation du propriétaire.
