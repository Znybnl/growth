# Guide pratique de la fiche Google d’un restaurant — #690

## Résultat et périmètre

Article `/blog/creer-fiche-google-restaurant`, avec trois entrées selon la situation du restaurateur, dix étapes, dépannage et checklist. Il réutilise la présentation pratique du guide beauté sans la modifier.

- Cas fictif du Comptoir des Tilleuls : 32 places, horaires de salle et de dernière commande distincts, retrait sur deux jours, carte de quatre plats à adapter.
- Réservation, commandes, fournisseurs tiers et photos traités séparément, avec action, résultat à vérifier et solutions de repli lorsque Google ne propose pas le champ attendu.
- Cas de mesure fictif : 80 sessions, 12 réservations attribuées et dédupliquées dont tous les créneaux sont passés, dix tables honorées, une annulation et une absence, 28 couverts. Les 840 € calculés ne sont ni une marge ni une preuve de revenu incrémental.
- Avis éditorial motivé et animation Okado présentée comme un objectif de retour indépendant d’un avis Google ou de sa note.
- Environ 3 820 mots, 19 minutes indicatives, 20 références officielles, liens proches des affirmations et maillage depuis l’article des jeux-concours en restaurant.
- Couverture originale SVG/WebP de 1 600×800, 34 528 octets pour le WebP. Deux captures Google datées et agrandissables : recherche 500×330 (10 677 octets), formulaire de catégorie 500×640 (39 492 octets).

## Sources et preuves

Procédures Google consultées le 29 octobre 2026 : ajout/revendication, propriété et doublons, identité et restauration virtuelle, catégories, validation/vidéo, modification de la fiche, horaires supplémentaires et exceptionnels, menu, liens et règles des pages de destination, commandes/fournisseurs, photos, avis et QR, classement local, performances, rétablissement. Les références sont présentes dans le registre de l’article et rendues dans son HTML.

Les deux captures proviennent de `https://business.google.com/create?hl=fr`. Seul le mot générique « Restaurant » a été saisi dans le champ catégorie ; le nom est resté vide. L’étape acceptant les conditions n’a pas été validée, aucune fiche n’a été créée ou modifiée. Les fichiers sont des captures cadrées de l’interface réelle, sans reconstruction graphique. Les écrans privés de gestion, de validation ou de menu n’ont pas été photographiés faute de restaurant réel autorisé ; les procédures sourcées remplacent ces illustrations.

Références de relecture éditoriale, distinctes des sources métier visibles de l’article :

- [Google — contenu utile et fiable](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=fr)
- [Google — fonctionnalités d’IA et sites Web](https://developers.google.com/search/docs/appearance/ai-features?hl=fr)
- [Google — règles concernant le spam](https://developers.google.com/search/docs/essentials/spam-policies?hl=fr)

La valeur ajoutée réside dans l’organisation des actions du restaurateur, les exemples adaptés au service et l’analyse des résultats. Aucune étude de performance n’est inventée, aucun témoignage client ou audit terrain n’est revendiqué. La lisibilité en HTML et les sources ne garantissent ni indexation, ni classement, ni citation par un moteur d’IA. Aucun balisage `Restaurant` ne représente l’établissement fictif.

## Impacts techniques et données

- Ajout de l’article au registre du blog : URL, titre SEO, description de 157 caractères, couverture sociale, canonical, BlogPosting, fil d’Ariane et sitemap via le gabarit existant.
- Retrait du `about` pointant systématiquement vers le logiciel Okado pour les objets éditoriaux Article/BlogPosting. L’association produit des objets WebPage est conservée. Les tests HTML des 36 articles vérifient cette correction sémantique.
- Ajout du seul chemin public exact de l’article aux listes analytics des deux applications. Consentement, schéma des événements, données personnelles et refus des chemins arbitraires inchangés. Aucun corps d’article importé dans les bundles clients.
- Aucune migration, écriture Google, données SaaS, authentification ou paiement modifiés.
- La date du registre est celle de la préparation du 29 octobre. Lors du premier déploiement, ajuster `publishedAt` à la date réelle de publication si elle diffère ; ne pas transformer la préparation en preuve de publication.

## Vérifications effectuées

- `npm run lint:landing` : succès, sans erreur.
- `npm run build:landing` : succès, 66 pages générées dont les 36 articles.
- `npm run test:analytics-consent -w @okado/web-app` : 10/10 succès ; contrôle de tous les articles sur les deux listes, refus des données et chemins non autorisés, consentement conservé.
- `npm run lint:web` : succès, quatre avertissements préexistants `window.location.assign` sur des composants non modifiés.
- `npm run build:web` : succès, 85 pages générées.
- `PLAYWRIGHT_BASE_URL=http://localhost:3254 npm run test:e2e -w @okado/landing-page -- google-profile-restaurant-guide.spec.ts google-profile-beauty-guide.spec.ts seo-public-pages.spec.ts --grep 'guide restaurant|guide Google|tous les articles|sitemap, robots|le blog utilise' --project=desktop --project=mobile` : 12 succès en 1,6 minute, deux cas ignorés intentionnellement (hauteur 600 réservée à l’ordinateur).
- Contrôle supplémentaire avec `--grep 'choisir son point' --project=small-mobile --output=test-results/restaurant-320` : un succès en 5,4 secondes.
- Parcours d’entrée, sommaire mobile, originaux PNG et ouverture clavier, quatre tableaux, suivi facultatif repliable, dix cases, bilan fictif, CTA et absence d’erreur JavaScript vérifiés. Le guide beauté reste fonctionnel ; le contrôle HTML vérifie les sources, liens, métadonnées, fil d’Ariane et sitemap des 36 articles.
- `git diff --check` : succès.

Captures inspectées à 1280×720, 1280×600, 390×844 et 320×740 : en-tête avec navigation réelle, carte, horaires, capture de catégorie, bilan et dépannage. Les tableaux sont présentés en fiches lisibles sur téléphone, sans débordement global. Les captures Google sont agrandissables ; leur petit texte est à consulter en taille originale si nécessaire.

Preuves locales (ignorées par Git) : `apps/landing-page/test-results/google-profile-restaurant--e0124-rifier-le-bilan-visual-1280-{desktop,mobile}/restaurant-guide-*.png`, `google-profile-restaurant--61598-ge-à-1280-×-600-visual-1280-desktop/` et `test-results/restaurant-320/`.

## Relecture et retour arrière

Aperçu local : `http://localhost:3254/blog/creer-fiche-google-restaurant`. Choisir « Je gère une fiche validée », lire les horaires et la carte, tester le sommaire et l’agrandissement d’une capture sur mobile, puis cocher la checklist. Ne pas créer de fiche ou de réservation réelle pour relire l’article.

Retour arrière : revert de la PR, sans migration ni correction de données. Article préparé pour validation du propriétaire ; aucun merge ni déploiement en production effectué dans cette intervention.
