# Baseline mobile du site public — #519

## Objet et limites

Le propriétaire a demandé de traiter les recommandations du bilan SEO le
21 octobre 2026. Cette phase mesure et priorise ; elle ne modifie pas le
chargement du site, les traceurs ou le consentement en production.

Les valeurs ci-dessous sont du **laboratoire sur un poste Windows**, pas des
Core Web Vitals terrain. Le benchmark CPU varie fortement et deux passages
Beauté ont un avertissement de CPU plus lent que celui attendu. Les scores
ne sont donc ni un SLA, ni un classement Google, ni un benchmark stabilisé.
Une comparaison avant/après devra répéter le protocole sur un hôte mieux
stabilisé/calibré ; les variations ne prouvent pas une régression du site.

GSC affiche « Aucune donnée » en mobile et ordinateur. La tentative publique
PageSpeed Insights API du même jour renvoie **429 RESOURCE_EXHAUSTED** :
aucune mesure distante ou donnée CrUX supplémentaire obtenue. LCP/INP/CLS
terrain au p75 : **N/D**, et non zéro ou échec. TBT n'est pas INP.

## Protocole conservé

- Production `https://www.okado.app`, 21 octobre, **11:02:19–11:06:25 UTC**.
- Lighthouse **13.5.0**, Chromium **151.0.0.0**, mode CLI headless, profil
  isolé neuf sans session utilisateur ; trois runs séquentiels par URL.
- Émulation mobile 412×823, DPR 1,75, throttling simulé : RTT 150 ms,
  débit 1638,4 Kbit/s, CPU ×4 (valeurs Lighthouse par défaut).
- Première visite sans choix de consentement, bandeau visible. Aucun
  clic de jeu, inscription, compte ou e-mail. Aucun appel réseau analytics
  observé dans les douze rapports ; PostHog et Vercel Analytics sont aussi
  bloqués par deux motifs distincts dans la configuration.
- Aucun lint/build/test lourd en parallèle. L'activité du poste et les
  consoles de diagnostic ne sont pas une infrastructure de test dédiée.
- Les médianes sont calculées indépendamment pour chaque métrique sur les
  trois runs, pas une moyenne des scores ni un percentile terrain.
- Rapports JSON, traces et devtools logs bruts conservés dans les artefacts
  locaux `seo-mobile-20261021-filtered/`. Les 12 métriques, avertissements,
  paramètres et SHA-256 des rapports sont
  [versionnés ici](../seo/2026-10-21-mobile-baseline.json).

Une série préparatoire `seo-mobile-20261021/` n'est pas retenue dans la
baseline : la CLI avait interprété deux motifs séparés par une virgule
comme un seul motif. Ses journaux ne contiennent aucun appel analytics.
La configuration versionnée corrige ce point et les douze runs ont été
rejoués ; aucune série n'est choisie pour son meilleur score.

Reproduction depuis la racine du dépôt, Chrome/Chromium installé :

```powershell
$env:CHROME_PATH='C:/chemin/vers/chrome.exe'
npm exec --yes --package=lighthouse@13.5.0 -- lighthouse https://www.okado.app/ --config-path=./scripts/lighthouse-mobile.cjs --chrome-flags="--headless" --output=json --output-path=./home-1.json --save-assets --quiet
```

Exécuter successivement trois fois par URL : `/`,
`/instituts-beaute`, `/restaurants`, `/tarifs`, avec des noms de sortie
distincts hors du dépôt. Vérifier profil neuf, versions, paramètres,
avertissements, statuts HTTP et absence de requêtes analytics avant analyse.
Ne pas fournir le profil, les cookies ou les identifiants du propriétaire.

## Résultats

| Page | Score médian (étendue) | LCP médian | TBT médian | CLS médian | Transfert médian |
| --- | --- | --- | --- | --- | --- |
| Accueil | 74 (68–76) | 3,42 s | 652 ms | 0 | 540 Kio |
| Beauté | 72 (70–86) | 3,56 s | 732 ms | 0 | 498 Kio |
| Restaurants | 89 (84–91) | 3,11 s | 237 ms | 0 | 427 Kio |
| Tarifs | 89 (84–90) | 3,16 s | 249 ms | 0 | 413 Kio |

Un run accueil a un CLS de 0,0000499 ; les autres sont à zéro dans cette
navigation laboratoire. Cela ne certifie pas le comportement de toutes les
interactions. Les benchmarks CPU vont de **675,5 à 2132** dans la série :
les classements entre pages et les TBT doivent être interprétés prudemment.

## Diagnostic appuyé par les rapports

1. **Le LCP détecté est le paragraphe du bandeau de consentement**,
   `section#okado-cookie-preferences > p.mt-3`, sur les douze runs.
   Cette première visite ne mesure donc pas directement le rendu du hero
   après refus/acceptation. Il serait trompeur d'attribuer ces 3–3,6 secondes
   à une image de roue ou de modifier le hero à partir de ce seul chiffre.
2. **Coût initial JavaScript observable** : environ 104 Kio sont signalés
   comme inutilisés pendant le chargement, dans deux chunks publics
   (`3lgsm1w009mq8.js` et `3b0xd2czvvbs2.js`). Sur le premier run
   accueil, le thread principal consomme 2,90 s : évaluation script 1,16 s,
   style/layout 0,96 s, parsing/compilation 0,11 s. Ce sont des observations
   de ce run, pas un budget universel ou une preuve que tout ce code peut
   être supprimé. Le coût CPU et les TBT sont sensibles à la machine.
3. **Images de galerie** : l'audit suggère environ 74 Kio d'économie sur
   l'accueil, mais zéro économie LCP pour cette opportunité. Les miniatures
   sont sous le premier écran ou dans le carrousel. Vérifier dimensions
   utiles, DPR, tailles demandées et aperçu agrandi avant de réduire les
   sources ; ne pas dégrader les modèles pour gagner un score.
4. Les deux CSS initiaux (~10 Kio chacun) apparaissent dans le chemin
   critique, mais l'estimation LCP de l'audit correspondant est nulle.
   Aucune raison mesurée de retirer des styles en priorité ici.
   Le premier run accueil reçoit son document en ~78 ms sur la connexion
   brute de cette machine ; ce n'est pas une latence utilisateur terrain.

## Prochaines corrections à évaluer dans #519

1. **P1 diagnostic** : stabiliser/calibrer l'hôte et mesurer aussi une
   visite avec refus déjà mémorisé, analytics toujours bloqués ; garder la
   première visite comme scénario distinct. Ne pas masquer le bandeau
   nécessaire pour améliorer artificiellement le score.
2. **P2 implémentation à analyser** : attribuer les chunks via les traces
   puis tester le découpage/chargement différé des modules non nécessaires
   au premier écran. Toute modification du SDK doit conserver l'absence
   d'initialisation avant accord, l'envoi CTA avant navigation, l'identité
   inter-sous-domaines et le retrait immédiat. Pas d'import massif du
   registre éditorial pour résoudre la mesure du blog.
3. **P2 secondaire** : ajuster les tailles de miniatures si l'écart persiste
   après prise en compte du DPR et de l'aperçu. Comparaison avant/après
   sur le même protocole, tests 320/390/768/1280 px.

Aucune optimisation de performance appliquée dans cette livraison de mesure ;
aucune garantie de gain LCP, INP ou de positionnement. #519 reste ouverte
pour la consolidation de la baseline et les éventuelles PR ciblées.

Méthode : [variabilité Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md),
[throttling](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md),
[interprétation des scores](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring).
