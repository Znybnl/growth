# Six modèles visibles sans carrousel — #698

## Résultat

La section « Les modèles Okado » présente six cartes en grille : six colonnes à partir de 1200 px, trois de 768 à 1199 px, deux sur téléphone. À 1280×720, les six cartes de l’accueil sont entièrement visibles simultanément après arrivée sur la section, avec la vraie navigation du site. Le défilement horizontal et ses flèches ont été retirés.

L’introduction est compacte sur grand écran : titre sur une ligne quand la largeur le permet, espacement propre à cette section, images de téléphone complètes et bouton d’agrandissement conservé sur chaque carte. La hauteur normale des pages reste libre sur tablette et téléphone pour conserver des images et libellés utilisables.

Sélection de l’accueil : Nude Élégance, Classique, Beauty Pop, Botanique Premium, Noël traditionnel (`christmas-traditional`) et Halloween (`halloween-gold`). Confetti est retiré de cette sélection. La galerie de `/ticket-a-gratter` conserve ses six modèles Beauté et utilise le même affichage responsive. Les autres exemples sectoriels et jeux marchands ne sont pas modifiés.

## Visuels et provenance

Les nouveaux fichiers sont des captures du vrai `CampaignExperience` à 390×844, facteur d’échelle 2, puis encodées en WebP qualité 84, sans modification graphique :

- `apps/landing-page/public/images/game-christmas.webp` : 780×1688, 150 610 octets. Modèle Noël traditionnel depuis `/dev/christmas-wheels?template=christmas-traditional&mode=public`, exemple synthétique Maison Douceur.
- `apps/landing-page/public/images/game-halloween.webp` : 780×1688, 148 394 octets. Modèle Halloween depuis la fixture locale de rendu avec une enseigne boutique fictive, police Bodoni et personnalisations autorisées par le produit.

Reproduction : `apps/web-app/e2e/seasonal-marketing-captures.spec.ts`. Ce contrôle utilise les fixtures de développement, refuse le consentement analytique et intercepte les API et requêtes HTTPS externes. Aucune campagne créée, aucun tirage ou stock réel, aucune donnée personnelle. La marque de développement Next est masquée dans les captures uniquement. Les images ne sont pas des maquettes reconstruites.

Les captures originales PNG sont dans le dossier ignoré `apps/web-app/test-results/seasonal-marketing-capture-37735-and-Halloween-game-captures-chromium/`. Les WebP sont servis par `next/image` avec des tailles adaptées aux miniatures et aux aperçus. Les deux sources respectent le budget existant inférieur à 300 Ko et les règles d’inclusion de `.vercelignore`.

## Parcours et impacts

La sélection d’une carte ouvre le même dialogue natif qu’auparavant. Escape et Fermer rendent le focus à la carte ; le nom du dialogue et l’image correspondent au modèle choisi. Le même appel `marketing_cta_clicked` / `model_preview` est conservé avec l’identifiant réel du modèle. Le consentement et les propriétés analytics ne sont pas modifiés ; les contrôles avec refus ne produisent aucun envoi ni mutation métier.

La vérification couvre le trajet carte → import d’image statique/optimiseur → dialogue → fermeture/restauration du focus. Aucun appel à une base ou à une API métier n’est nécessaire à ce parcours. Pas de migration, de modification du catalogue SaaS ou de suppression des modèles utilisés dans des jeux existants. Le seul fichier SaaS ajouté est le test de capture locale ; aucun composant produit SaaS n’est modifié.

## Vérifications finales

- `npm run lint:landing` : succès.
- `npm run build:landing` : succès, 66 pages générées.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3260 npm run test:e2e -w @okado/web-app -- seasonal-marketing-captures.spec.ts --project=chromium` : un succès en 11,3 secondes. Le premier passage utilisait le sélecteur générique de roue ; le contrôle final cible les composants saisonniers réels et vérifie leur dégagement sous le titre.
- `npm exec -w @okado/web-app -- eslint e2e/seasonal-marketing-captures.spec.ts` : succès.
- `PLAYWRIGHT_BASE_URL=http://localhost:3255 npm run test:e2e -w @okado/landing-page -- site-refresh.spec.ts multisector-demo.spec.ts seo-public-pages.spec.ts --grep 'six modèles|galerie :|trois secteurs|sitemap, robots' --project=desktop --project=tablet --project=mobile --project=small-mobile` : 13 succès en 35,5 secondes. Trois cas ignorés intentionnellement : le contrôle 1280×600 est réservé à l’ordinateur.
- Grille de six cartes vérifiée sur l’accueil et `/ticket-a-gratter`, sans débordement horizontal ou de page. Sur ordinateur, chaque carte doit être entièrement dans le viewport après arrivée sur la section.
- Aperçus Nude Élégance et Beauty Pop conservés ; Noël et Halloween vérifiés au clavier, avec images chargées et focus rendu au déclencheur. Contrôle de Fermer à 1280×600. Démo des trois secteurs et absence de collecte sous refus conservées.
- Nouveaux fichiers distribués et budget de poids contrôlés avec les autres assets publics. `git diff --check` : succès.

Captures inspectées : grille 1280×720 avec navigation réelle et ses six cartes visibles, galerie complète sur tablette 768×1024 et mobile 390×844, entrée à 320×740 et dialogues saisonniers à 1280×600. Les téléphones restent proportionnés, sans texte recouvert ; les images peuvent être agrandies pour lire les détails.

Preuves locales : `apps/landing-page/test-results/site-refresh-six-modèles-e-8b6ac-ns-appel-métier-visual-1280-{desktop,tablet,mobile,small-mobile}/models{,-viewport}.png`, captures `christmas-dialog.png` / `halloween-dialog.png`, et dossier `site-refresh-galerie-accès-f37e4-rs-à-1280-×-600-visual-1280-desktop/`.

## Relecture et livraison

Aperçu local : `http://localhost:3255/#modeles`. Vérifier les six univers, ouvrir Noël et Halloween, fermer au clavier puis tester la disposition sur téléphone. Cette URL locale n’est pas une preuve de déploiement.

Branche `codex/six-model-gallery`. Merge et production après validation du propriétaire. Retour arrière par revert de la PR, sans migration ou correction de données.
