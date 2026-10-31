# Hero d’accueil centré et aéré — #719

## Résultat utilisateur

La promesse et le bouton d’essai sont disposés sur un axe central. Le titre prend deux lignes sur grand écran, avec une typographie plus ample et un interlignage moins serré. L’explication, le CTA et ses conditions forment une suite de lecture verticale. Le hero et la démonstration restent deux séquences distinctes.

La référence fournie par le propriétaire inspire la disposition, l’ampleur du titre et la position du CTA. L’identité claire d’Okado est conservée : fond ivoire, encre prune et accent violet sur « revenir ». Aucun badge d’avis, témoignage, note Google ou chiffre de clientèle n’est ajouté. La promesse, les conditions et le lien d’inscription existants sont conservés.

## Composition

- Axe centré, titre jusqu’à 68 px sur ordinateur, deux groupes de mots qui peuvent se répartir naturellement sur téléphone. Espacement des lettres et interlignage desserrés.
- Largeur du titre limitée à 960 px, explication à 650 px, espace de 24 px avant le texte, puis 28 px avant le groupe d’inscription sur ordinateur.
- Bouton d’essai de 52 px minimum, conditions directement dessous et centrées.
- Espaces extérieurs de 64/56 px sur ordinateur, 40/36 px sur téléphone. Ces valeurs donnent de l’ampleur sans une hauteur plein écran imposée.
- Bords alignés sur le cadre de démonstration. La transition existante reste de 32 px sur ordinateur et 24 px sur mobile ; l’espace de 20 px entre la barre de démo et son cadre est conservé.
- À 1440×900, le début du cadre et le haut du téléphone de démonstration sont dans la première fenêtre. À 390×844, le titre de la démo et ses sélecteurs sont visibles dans la première fenêtre.

## Périmètre et risques

Seuls `HomeHero`, ses styles et le test de disposition d’accueil changent. Les sélecteurs modifiés de `showcase.module.css` sont propres au hero d’accueil ; les introductions Beauté/Restaurants utilisent leurs propres classes et sont vérifiées.

Aucune figure, image, police, dépendance ou animation ajoutée. Le téléphone interactif et ses textes ne sont pas redimensionnés. Le contenu de la démo, les ancres sectorielles, le choix par défaut et le suivi `start_trial` / `hero` sont conservés. Aucun changement de données, API, consentement ou paiement.

La galerie de modèles fait l’objet de la PR #700 distincte, non incluse dans cette branche. Les deux évolutions utilisent le même fichier CSS et pourront nécessiter une intégration de leurs modifications lors du merge ; leurs sélecteurs fonctionnels sont distincts.

## Vérifications

- `npm run lint:landing` : succès.
- `npm run build:landing` : succès, 66 pages générées.
- Avec `PLAYWRIGHT_BASE_URL=http://localhost:3256` : `npm run test:e2e -w @okado/landing-page -- site-refresh.spec.ts multisector-demo.spec.ts --grep "hero centré|accueil expose|les trois secteurs|liens directs" --project=desktop --project=mobile` : sept succès en 33,7 secondes. Un cas ignoré intentionnellement sur mobile : la matrice complète des dimensions est exécutée une seule fois depuis le projet desktop.
- La matrice contrôle 320×740, 360×800, 390×844, 768×1024, 1280×720, 1280×600 et 1440×900 : absence de débordement, centrage du texte et du CTA, espacement sous le texte, conditions entièrement dans la fenêtre, alignement avec la démo et distances de transition. Le titre tient sur deux lignes à 1440 px ; le hero dépasse 420 px de hauteur sur grand écran pour éviter la compression précédente.
- Le cadre de démo doit commencer avant Y=900 à 1440×900 ; le titre d’entrée doit finir avant Y=844 à 390×844. Les tests de démo contrôlent aussi les trois secteurs, les parcours jusqu’à l’e-mail, le ticket au pointeur et les liens directs après rechargement, sans collecte sous refus.
- Avec le même serveur : `npm run test:e2e -w @okado/landing-page -- beauty-demo-access.spec.ts --grep "Beauté : hero" --project=desktop --project=mobile --output=test-results/hero-sectors` : deux succès en 9,8 secondes. Les dispositions Beauté/Restaurants, le fond Rose poudré et la position de leurs informations d’abonnement sont conservés.
- `git diff --check` : succès.

Captures inspectées avec la vraie navigation : 1440×900 et 1280×720 (promesse, CTA, transition et entrée de la démo), 1280×600 (CTA et conditions disponibles), 768×1024, 390×844 et 320×740 (retours de ligne, largeur de lecture et absence de chevauchement). Le texte est lisible et le téléphone appartient uniquement à la démo.

Preuves locales ignorées par Git : `apps/landing-page/test-results/site-refresh-hero-centré-r-409f3-e-démo-visibles-visual-1280-desktop/hero-{largeur}x{hauteur}.png`. Les mesures sont aussi jointes au test sous le nom `hero-layout`.

## Relecture et retour arrière

Aperçu : `http://localhost:3256/`. Vérifier l’ampleur du titre, la place du bouton, puis l’arrivée naturelle sur « Essayez le parcours de vos clients ». Tester aussi sur téléphone et ouvrir un secteur de la démo.

Branche `codex/airy-centered-home-hero`. PR soumise au propriétaire ; aucun merge ni déploiement effectué dans cette intervention. Retour arrière par revert, sans migration ou correction de données.
