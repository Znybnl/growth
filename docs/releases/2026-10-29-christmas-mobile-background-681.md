# Fond des pages de jeu Noël — #681, PR #682

## Cause et état de livraison

Le décor des roues Noël était peint à l'intérieur de la scène centrale, dont la
hauteur minimale utilisait `100dvh`, alors que la page utilise `100vh`. Sur un
navigateur mobile, ces hauteurs peuvent différer quand les barres sont visibles.
Toute hauteur de page supplémentaire pouvait donc laisser apparaître sa couleur
unie sous le décor. La bande de Noël rose est rose presque blanche, pas une
partie du fichier image.

La PR #682 était encore ouverte lors du nouveau signalement du 29 octobre : son
premier correctif n'était pas fusionné dans `main`. Cette reprise complète la
même PR et l'issue existante, sans créer de second correctif concurrent.

## Correction

- Le fond natif est peint une seule fois sur le conteneur de toute la page,
  comme les autres fonds intégrés. La scène reste transparente sur ce conteneur.
- L'image ou la couleur choisie par le marchand utilise également ce conteneur,
  sans second décor limité à la scène et sans ajout du dégradé générique.
- La hauteur minimale de la scène publique est alignée sur la page.
- Aucun changement des textes, lots, tirages, probabilités, stocks, consentement
  ou API. Les aperçus intégrés conservent leur scène autonome et leur fond.
- Aucun changement de données ni migration SQL. Un revert de la PR suffit pour
  revenir au rendu précédent.

## Preuves visuelles et tests

Reproduction contrôlée : viewport 390×740 et page étendue de 128 px, pour
vérifier explicitement le cas où la page dépasse la scène. Avant correction,
image de 740 px pour une page de 868 px : bande unie de 128 px. Après correction,
image de 868 px, jusqu'au bas et derrière « Règlement ». Ce test de contrainte
n'est pas présenté comme la mesure des barres d'un téléphone physique.

Le scénario `e2e/christmas-background-coverage.spec.ts` vérifie :

- les ambiances rose, naturelle et traditionnelle en roue et ticket ;
- les images chargées, leur couverture réelle, leur rattachement à la page et
  la variation des pixels du bas, en plus des seules dimensions DOM ;
- le défilement jusqu'en bas, la présence de Règlement, le sous-titre long,
  les viewports 320×568, 390×740 et 390×844 et leurs changements de taille ;
- la prévisualisation avec son bandeau, les fonds image/couleur manuels et
  l'absence de doublon d'image ou de fond opaque dans la scène publique ;
- les captures à 1280×720/600 et une roue Nude comme contrôle hors Noël.

Il est ajouté au job CI Noël et à la recette WebKit. Les fixtures de test restent
inaccessibles hors développement. Tous les appels API et services externes sont
interceptés : aucune partie réelle, écriture ou notification n'est déclenchée.

Captures avant/après : `apps/web-app/test-results/christmas-band-audit/`.
Captures du correctif : `apps/web-app/test-results/christmas-681-coverage/` et
`christmas-681-webkit/`, dont les six bas de page ont été inspectés visuellement.
La prévisualisation iPhone/WebKit et les vues 1280 px ont aussi été inspectées.

Commandes de vérification :

```text
npm run test:christmas-wheels -w @okado/web-app
npm run test:christmas-scratch -w @okado/web-app
npx playwright test e2e/christmas-background-coverage.spec.ts --project=chromium
npx playwright test -c playwright.christmas.config.ts e2e/christmas-background-coverage.spec.ts --project=webkit
npx playwright test e2e/christmas-wheels.spec.ts e2e/christmas-scratch.spec.ts --project=chromium
npm run lint:web
npm run build:web
npm run verify:source
```

Les commandes Playwright utilisent le serveur local via `PLAYWRIGHT_BASE_URL`.
Lint sans erreur (4 avertissements préexistants), build et vérification des
sources réussis. Les 13 tests unitaires Noël sont réussis. Les suites navigateur
couvrent 41 scénarios Chromium et 14 WebKit. Deux reprises ciblées ont été
nécessaires pendant cette vérification : une navigation WebKit interrompue
pendant une recompilation et un geste de grattage effectué avant stabilisation
des polices. Le test de grattage attend désormais les polices avant de mesurer
les coordonnées, en plus du chargement du revêtement déjà vérifié.

## Recette de production après validation

Sur Chrome Android et Safari iOS, ouvrir une roue Noël rose, faire défiler jusqu'au
bouton Règlement et afficher/masquer les barres du navigateur. Refaire avec les
deux autres ambiances, un ticket et la prévisualisation. Le décor doit continuer
jusqu'en bas. La vérification locale ne constitue pas une preuve de déploiement.
