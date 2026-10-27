# Trois roues de Noël — #674

## Résultat

Trois modèles supplémentaires, disponibles pour tous les secteurs : Noël rose
poudré, Noël naturel, Noël traditionnel. Les trois variantes explicitement nommées
par le propriétaire constituent le périmètre de sa demande.

- Rose : sapin givré, boules roses, cadeaux clairs, encre bordeaux, roue rose/ivoire.
- Naturel : sapin, eucalyptus, kraft, encre vert forêt, roue vert/ivoire/champagne.
- Traditionnel : velours rouge, branches de sapin, rubans et cadeaux rouges/or,
  titre champagne, roue rouge/vert/ivoire.

Les composants de sélection et les réglages des deux éditeurs sont conservés.
Le logo, le titre, le sous-titre, les couleurs, la police et les espacements restent
personnalisables. Un filet discret accompagne le logo texte uniquement.
Le bouton JOUER est sans icône, avec relief et reflet supérieur gauche. Le pointeur
et les trois fines lignes du contour restent immobiles pendant la rotation.
Les libellés utilisent DM Sans et le composant existant d'ajustement individuel.

## Réutilisation et isolation

La scène et le dessin SVG sont partagés par la page de jeu, les aperçus des deux
éditeurs et les miniatures. Les nouveaux identifiants sont acceptés par le parseur
existant et les réglages par template continuent d'être mémorisés séparément.
Le fond natif est résolu à l'affichage, jamais enregistré comme image marchand.
Une image manuelle ou une couleur personnalisée reste prioritaire.
Les trois décors sont aussi proposés dans la bibliothèque sous Noël.

Le moteur de rotation existant reste responsable du démarrage et de l'arrivée.
La sélection visuelle commune vise six secteurs mais conserve tous les lots
distincts et le résultat exact, y compris au-delà de six lots.
Aucun tirage, poids, stock, accès, action, participation, e-mail ou consentement
n'est modifié. Aucun lot fictif n'est enregistré. Aucune migration SQL.
La bande promotionnelle de la référence n'est pas ajoutée au parcours.

## Assets livrés

Fichiers dans `apps/web-app/public/images/wheel-templates/` :

| Décor | Dimensions | WebP | Miniature WebP |
|---|---|---:|---:|
| christmas-rose | 940 × 1672 | 215 644 octets | 17 146 octets |
| christmas-natural | 940 × 1672 | 247 816 octets | 15 542 octets |
| christmas-traditional | 941 × 1672 | 207 682 octets | 16 874 octets |

Images générées avec l'outil intégré ImageGen, puis encodées avec Sharp en WebP
qualité 82 ; miniatures largeur 240, qualité 72. Aucun nouveau fournisseur ou
appel de génération dans l'application. Le fond contient uniquement le décor.
Les textes, boutons et secteurs restent de vrais composants interactifs.

`.vercelignore` inclut explicitement `christmas-*.webp`. Le contrôle local des
assets et de l'optimiseur d'image ne constitue pas une preuve de déploiement :
les mêmes URL devront être vérifiées sur le déploiement candidat autorisé.

### Prompts de génération

Instruction commune : produire un seul fond mobile opaque portrait 9:16,
photographique et détaillé, en utilisant la carte correspondante de la collection
comme référence de style. Décorer les 12 % extérieurs de chaque côté et le bas ;
garder le centre dégagé pour le logo, le titre et la roue ajoutés en code.
Exclure texte, lettres, chiffres, logo, roue, interface, bandeau, téléphone et collage.

- Rose : « Noël rose poudré et blanc givré. Frosted fir needles with realistic
  fine white snow at far edges, blush pink and pearl Christmas glass baubles,
  champagne fairy lights, elegant pale pink wrapped gifts in the bottom corners.
  Soft luminous blush ivory center. No flowers or hearts. Rose-gold subtle details. »
- Naturel : « Noël naturel et minimal. Warm tactile ivory linen paper center,
  deep green realistic fir sprigs and muted eucalyptus leaves at far edges,
  pine cones, simple kraft paper gifts with twine at bottom corners, a delicate
  wooden star at upper right edge. Restrained natural styling, rich real textures,
  warm champagne fairy light accents, no snow overload. »
- Traditionnel : « Noël traditionnel rouge et vert. Deep luxurious burgundy red
  velvet subtle center, realistic rich evergreen fir garlands along the sides,
  glossy deep red baubles, golden fairy lights, red satin ribbon in corner foliage,
  elegant red and gold wrapped presents at bottom corners. Warm sophisticated
  realistic cinematic Christmas glow, not cartoon. »

## Vérifications et itérations

- Inspection des trois images générées avant leur intégration.
- Première inspection des vraies pages mobiles : logo agrandi, sous-titre réduit
  légèrement, anneaux affinés et miniatures éclaircies derrière les textes.
- Arrondi des coordonnées SVG pour éviter les différences trigonométriques
  infimes entre Node et les moteurs de navigateur lors de l'hydratation.
- Contrôle à 320 et 390 px des trois pages et des aperçus intégrés ; ratio
  typographique vérifié dans le viewport utile de 390 × 740, avant mise à l'échelle.
- Contrôle du vrai wizard avec navigation à 1280 × 720 et 1280 × 600 :
  sélection, miniatures, aperçu en popin et disponibilité de l'enregistrement.
- Vérification de l'éditeur classique et d'un wizard Commerce.
- Contrôle WebKit avec configuration iPhone 13, images et personnalisation.
- Les captures WebKit conservent le curseur natif : le masquage automatique de
  Playwright injectait sinon un style dans les champs pendant l'hydratation de
  la fixture. Les interactions attendent explicitement son hydratation.
- Aucun serveur de production, base réelle ou e-mail n'est utilisé par ces tests.

Commandes :

```text
npm run verify:source
npm run test:christmas-wheels -w @okado/web-app
node --experimental-strip-types --import ./scripts/ts-alias-loader.mjs --test src/lib/christmas-wheel-themes.test.mjs src/lib/wheel-segments.test.mjs src/lib/halloween-wheel-theme.test.mjs
npx playwright test e2e/christmas-wheels.spec.ts e2e/beauty-wheel-themes.spec.ts --workers=1
npx playwright test -c playwright.christmas.config.ts --project=webkit --grep "vraie page|personnalisation"
npm run lint:web
npm run build:web
```

Les commandes Node et Playwright sont exécutées depuis `apps/web-app` ;
les commandes npm de lint/build/verify depuis la racine.
Les captures inspectées sont conservées localement dans
`.codex-logs/christmas-674/`. La configuration dédiée
`playwright.christmas.config.ts` permet de rejouer la recette WebKit après
`npx playwright install webkit` ; elle reprend la configuration existante.
Le contrôle Chromium et les tests de configuration sont ajoutés à la CI existante.
Quatre avertissements lint préexistants de navigation interne restent hors périmètre.

Résultats : 24 tests Playwright Chromium (dont 11 non-régressions des thèmes
Beauté), 7 tests WebKit et 14 tests Node réussis. Les deux contrôles à 1280 px
ont été rejoués après la correction de l'ancrage de l'image dans l'iframe :
aucun avertissement Next/Image de parent statique. Lint et build réussis.
Le smoke local compilé vérifie les six assets, les trois URL Next/Image et
le refus HTTP 404 de la fixture en production.

## Recette propriétaire et retour arrière

Créer ou ouvrir un jeu roue, choisir chacun des trois modèles, modifier le logo,
le titre et le sous-titre, puis changer de modèle et revenir au précédent.
Choisir un fond manuel, vérifier sa priorité, puis consulter l'aperçu.
Vérifier la rotation avec les vrais libellés de lots lors de la recette de test.
Après déploiement autorisé, contrôler les six assets et la page de jeu mobile.

Un revert de la PR retire les nouveaux modèles sans modifier les données.
Si des jeux les utilisent déjà, sélectionner un modèle existant avant le retrait
du code pour éviter un repli visuel générique. L'issue reste ouverte jusqu'à la
validation et la livraison.
