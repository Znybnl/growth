# Performances mobiles : nouvelle mesure et corrections — #519

## Protocole et limites

72 navigations Lighthouse 13.5.0 sont conservées : 24 sur www.okado.app,
24 sur le build local de production de main, 24 sur le build corrigé.
Chaque série couvre accueil, Beauté, Restaurants et Tarifs, trois fois en
première visite et trois fois avec refus de mesure mémorisé. Les pages et
scénarios alternent ; chaque navigation a un navigateur Chromium isolé neuf.
Même émulation mobile 412 × 823, DPR 1,75, réseau simulé 150 ms / 1638,4 Kbit/s
et CPU ×4. Aucun build ou test navigateur concurrent pendant les mesures.
Les sorties analytics sont bloquées et aucun appel analytics n'est observé.
Les mesures locales emploient une clé publique fictive uniquement pour
exercer le même bandeau ; aucune session de compte ni donnée utilisateur.

La production contrôlée est `okado-index`, SHA
`622f449d021b83c9ca4935e5761d7c9319b3899e`, déploiement READY
`dpl_Gdzh9dsN5tSt3rxxksWyZRk81X7o`, alias www.okado.app.
La comparaison locale utilise `next build` puis `next start`, même origine
localhost:3219, avant et après. Ne pas comparer directement les temps locaux
aux temps hébergés : distribution des ressources, caches et transport diffèrent.

Le benchmark CPU est 941–3190,5 sur la série publique, 3043–3426,5 avant et
3167,5–3511,5 après en local. Le poste n'est pas une machine de benchmark
dédiée, et les séries sont séquentielles. Conserver ces plages et tous les
runs ; aucune sélection des meilleurs scores, aucun résultat rejeté selon
sa performance. Une première navigation préparatoire a été interrompue par
une erreur de fermeture du lanceur, corrigée avant de rejouer les 24 runs
publics complets ; ce passage préparatoire est exclu du jeu de comparaison.

La tentative PageSpeed Insights API renvoie encore 429 RESOURCE_EXHAUSTED.
LCP/INP/CLS terrain au p75 et verdict CWV : **N/D**. Le TBT ci-dessous est
un diagnostic de laboratoire, pas l'INP. Trois passages ne permettent ni
une garantie de latence ni une démonstration statistique de gain.

Les 72 mesures, paramètres, plages, diagnostics et SHA-256 des rapports bruts
sont dans `docs/seo/2026-10-25-mobile-comparison.json`. Rapports bruts locaux :
`okado-mobile-519-20261025-production-v2`, `...-before`, `...-after` dans le
dossier temporaire de cette exécution ; aucun profil utilisateur utilisé.

## Mesures publiques actuelles

Médianes de trois passages, LCP en secondes, TBT en millisecondes :

| Page | Score première visite / refus | LCP première visite / refus | TBT première visite / refus |
| --- | --- | --- | --- |
| Accueil | 92 / 97 | 2,57 / 2,17 | 239 / 160 |
| Beauté | 94 / 93 | 2,42 / 2,20 | 214 / 213 |
| Restaurants | 94 / 98 | 2,26 / 2,12 | 216 / 126 |
| Tarifs | 97 / 93 | 2,17 / 2,43 | 178 / 204 |

CLS nul dans ces navigations. Le LCP première visite reste le paragraphe du
bandeau. Avec refus, il devient le titre de l'accueil ou le paragraphe
d'introduction des pages sectorielles et Tarifs. Le changement du score
depuis le 21 octobre n'est pas imputé à ces corrections : elles ne sont pas
encore en production, et le contexte CPU/versions du site a changé.

## Corrections retenues et risques

1. Le composant Vercel Analytics est chargé uniquement quand la branche
   consentie est rendue. L'initialisation PostHog, les conditions d'accord,
   les événements CTA et le contrôle avant envoi restent en place. Le retrait
   du consentement doit continuer à arrêter les captures.
2. `sizes` correspond à chaque rendu réel des modèles : galerie selon les
   breakpoints, cartes secteurs, spécialités et aperçu agrandi. Une variante
   320 px est ajoutée aux tailles Next/Image : une miniature de 178 CSS px au
   DPR1,75 requiert 312 px et reçoit 320 au lieu de 384. Les sources et la
   qualité d'encodage ne sont pas réduites. L'aperçu agrandi a son propre
   `sizes` pour conserver une définition adaptée.

Le coût dominant des scripts inutilisés reste en grande partie le runtime
React/Next ; il n'est pas supprimé sur la base d'une couverture au chargement.
Le poids net JavaScript est quasiment identique : les modules du mécanisme de
chargement compensent presque le code différé. Ce changement retire le
composant Analytics du chemin sans accord, mais ne constitue pas une économie
significative de bande passante ni une amélioration CWV démontrée.
Une première variante différant aussi les panneaux de démo a été mesurée
(24 runs supplémentaires, archive `okado-mobile-519-20261025-after`) puis
écartée : un scénario de Tab rapide perdait son ordre de focus pendant le
chargement. La démo est donc conservée telle quelle ; le gain net trop faible
ne justifie pas cette régression. Les mesures finales sont rejouées sur la
version retenue (`...-after-final`) ; les 72 runs comparés ne mélangent pas
les variantes. Le guide React/Next a guidé le chargement conditionnel et
la conservation du rendu initial. Les tests vérifient le téléchargement du
composant Analytics après accord et les parcours/clavier de la démo.

## Comparaison locale avant/après

Médianes ; les octets sont les transferts réellement rapportés par Lighthouse,
pas la taille non compressée des fichiers sources.

| Page | Transfert initial avant → après | JavaScript avant → après |
| --- | --- | --- |
| Accueil | 423 228 → 399 899 octets | 186 749 → 186 693 octets |
| Beauté | 386 279 → 386 285 octets | 188 586 → 188 563 octets |
| Restaurants | 311 560 → 311 525 octets | 188 586 → 188 563 octets |
| Tarifs | 295 968 → 295 917 octets | 186 749 → 186 693 octets |

L'accueil transfère environ 23 Ko de moins (5,5 %), surtout grâce aux images.
L'économie JS nette est seulement 23–56 octets par page après le coût des
imports dynamiques : elle est négligeable. Les trois autres pages ont un
transfert initial essentiellement inchangé. Les tailles adaptées concernent
aussi leurs miniatures au défilement, hors de ce premier chargement.
Les chiffres ne décrivent pas les étapes après clic.

| Page | LCP première visite avant → après | LCP refus avant → après | TBT première visite avant → après |
| --- | --- | --- | --- |
| Accueil | 3,32 → 3,29 s | 3,10 → 3,30 s | 51 → 37 ms |
| Beauté | 3,39 → 3,25 s | 2,93 → 2,93 s | 51 → 41 ms |
| Restaurants | 3,02 → 3,17 s | 2,67 → 3,17 s | 51 → 59 ms |
| Tarifs | 3,01 → 3,01 s | 2,90 → 2,90 s | 74 → 61 ms |

Les temps ne montrent **pas d'amélioration uniforme** : certains LCP simulés
augmentent, notamment Restaurants avec refus. Les LCP bruts observés sont
aussi conservés dans le JSON, distincts des résultats simulés ; ces séries
séquentielles ne permettent pas d'attribuer au code seul les écarts. Aucun gain
de temps causal ou gain terrain n'est revendiqué. Le CLS reste nul dans les
48 navigations locales. Une confirmation sur infrastructure de mesure stable
et sur le déploiement candidat reste nécessaire avant de conclure sur les CWV.

## Reproduction, vérifications et livraison

`node scripts/audit-mobile-519.mjs <dossier lighthouse 13.5.0> <origine> <sortie> 3`
réalise les 24 navigations. Lighthouse est un outil externe de diagnostic,
sans nouvelle dépendance applicative. Chromium vient de Playwright installé.
`node scripts/report-mobile-519.mjs <public> <avant> <après> <sortie.json>`
vérifie la complétude et agrège les médianes sans fusionner les scénarios.

Lint et build landing réussis (59 pages sur le socle mesuré, 62 après les
derniers articles intégrés). Les contrôles navigateur portent
sur les modules différés, la définition DPR/aperçu, les parcours roue/ticket,
le clavier, les conversions consenties et le refus/retrait. Le Quality gate
landing inclut désormais le chargement différé, la démo et le consentement
sur bureau et mobile, avec clé fictive et fournisseurs interceptés.

Résultat final sur les quatre formats : 96 tests navigateur réussis et
8 scénarios ignorés explicitement car réservés à un autre format (104 listés).
Le scénario clavier initialement défaillant est conservé et passe, sans
hausse de délai ni retrait d'assertion. Captures du rendu1280×720, galerie
et aperçu mobile DPR1,75 inspectées : lisibilité et dimensions conservées.
Vérification des sources, syntaxe des scripts et diffcheck réussis.

Le benchmark est figé sur le socle622f449 décrit plus haut. Les articles et
listes de routes publiques ajoutés entre-temps sur main (#662/#657) sont
intégrés avant PR ; les tests/build du candidat sont revérifiés. Les valeurs
ci-dessus ne sont pas une mesure du futur déploiement après fusion.
Après rebase sur main29fe789 : lint/build réussis et 24 contrôles ciblés
consentement, conversion et images/changement d'accord rejoués avec succès.

Pas de migration, de nouvelle collecte ou de forfait supplémentaire. PR à
valider par le propriétaire avant merge et production. Retour arrière :
revert applicatif et redéploiement ; pas de modification de données à annuler.
L'issue reste ouverte pour la livraison et la confirmation des performances.
