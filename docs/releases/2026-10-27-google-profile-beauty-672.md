# Guide pratique de la fiche Google pour institut — issue #672

## Résultat et périmètre

- Issue : https://github.com/Znybnl/growth/issues/672.
- Article : `/blog/creer-fiche-google-institut-beaute`, auteur organisationnel « L’équipe Okado », publication/relecture le 27 octobre 2026.
- Intention propre : réaliser la création/revendication, puis configurer et maintenir la fiche. Le guide d’acquisition existant conserve son rôle multicanal et renvoie vers cette procédure.
- Décisions métier inchangées : aucune fiche Google créée, aucun compte marchand ou joueur utilisé, aucune donnée personnelle ajoutée. Aucun changement au SaaS, au tracking, aux consentements ou aux droits.
- Le gabarit de blog accepte désormais des figures locales optionnelles, légendées, datées, accessibles au clavier et ouvrables en taille d’origine. Les articles sans figures gardent leur rendu.

## Sources et méthode éditoriale

Les liens d’aide Google Business Profile vérifiés figurent près des étapes et en fin d’article : compte, éligibilité, doublons, nom, catégories, validation, vidéo, services, réservation, photos, avis, classement et performances. Les intitulés et fonctions peuvent varier selon le compte, la catégorie, le pays et l’état de validation.

Les recommandations propres à Okado sont signalées comme un avis ou une proposition : ordre de priorité, contrôle de l’accès, reportage photo, journal des modifications et analyse des rendez-vous honorés. Aucun témoignage client, performance sectorielle ou expérience de terrain n’est inventé. Les montants et taux du cas de mesure sont explicitement fictifs ; les calculs sont visibles et leurs limites expliquées. La solution Okado est présentée comme une animation indépendante des avis, pas un outil de classement ou de réservation.

Références de méthode SEO/GEO, réservées à ce rapport plutôt qu’ajoutées au guide métier :

- [Google : contenu utile et fiable](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- [Google : règles antispam](https://developers.google.com/search/docs/essentials/spam-policies).
- [Google : fonctionnalités IA et sites](https://developers.google.com/search/docs/appearance/ai-features).
- [Journal officiel : September 2026 spam update](https://status.search.google.com/incidents/XhUDXP7A67iHCD2kmbVu), du 24 septembre au 8 octobre 2026 (heures US/Pacific).

Il n’existe pas de garantie d’immunité à cette mise à jour. Le travail porte sur une intention distincte, une procédure utilisable, des captures originales, des sources primaires et une analyse explicite, sans bourrage de mots-clés ni multiplication de pages locales. Les paragraphes nomment leur sujet pour rester compréhensibles isolément. Réponse courte, titres descriptifs, FAQ visible, tableaux, liens HTML, dates, canonical, BlogPosting et fil d’Ariane réutilisent le socle existant. Aucun balisage spécial « GEO », FAQPage ou HowTo n’est ajouté pour promettre un résultat enrichi ou une citation IA.

## Provenance des visuels

- Trois captures JPEG originales de l’interface française `https://business.google.com/create?hl=fr`, réalisées le 27 octobre 2026 : recherche, identité, suggestion « Institut de beauté ».
- Fichiers dans `apps/landing-page/public/images/blog/fiche-google-institut/`, 549 × 672 px ; pas de nom, d’adresse ou de dossier de cliente saisi.
- Seul le champ de catégorie a été renseigné. Aucun clic sur « Suivant » pour enregistrer un établissement ou accepter ses conditions. L’illustration à gauche appartient à Google et n’est pas présentée comme un institut créé par Okado.
- Limite exposée dans l’article : les captures couvrent le démarrage, pas les étapes privées de validation et de gestion d’un établissement réel. Celles-ci sont décrites et reliées à l’aide officielle ; aucune interface fictive n’est présentée comme une capture.
- Couverture : diagramme éditorial original en SVG avec dérivé WebP de 1 600 × 800 px, distinct de l’interface Google.

## Vérifications

- `npm run lint:landing` : succès.
- `npm run build:landing` : succès ; 63 pages précompilées, dont le nouveau guide.
- `npm run test:e2e -w @okado/landing-page -- google-profile-beauty-guide.spec.ts seo-public-pages.spec.ts --grep 'guide Google|tous les articles|sitemap, robots|le blog utilise' --project=desktop --project=mobile` : sept succès ; un test global du blog interrompu par un dépassement de délai et une fermeture de session navigateur pendant une interruption prolongée de l’exécution.
- Relance isolée, sans modification applicative : `npm run test:e2e -w @okado/landing-page -- seo-public-pages.spec.ts --grep 'le blog utilise' --project=desktop --output=test-results/retry-blog-desktop` : succès en 33,2 secondes. Les huit cas sélectionnés sont donc validés.
- Les tests du guide vérifient les trois images chargées, les dates, les originaux JPEG servis, le focus clavier, l’ouverture réelle de la capture en nouvel onglet, les tableaux, la navigation applicable, le CTA et l’absence d’erreur JavaScript/débordement.
- Les tests SEO contrôlent les 35 articles : liens dans le HTML serveur, sources, métadonnées uniques, BlogPosting, fil d’Ariane, dates, sitemap, images sociales et tableaux accessibles. Le blog et les fichiers distribués ont aussi été contrôlés.
- Inspection visuelle réalisée à 1280 × 720 et 390 × 844 : couverture, choix de catégorie et sa légende, tableau de priorités, avis éditorial et CTA. Les tableaux se parcourent horizontalement sur mobile ; les captures se consultent en taille d’origine. Pas de chevauchement ou de débordement de page constaté.
- Captures locales : `apps/landing-page/test-results/google-profile-beauty-guid-fb3f3-ans-débordement-visual-1280-{desktop,mobile}/google-guide-{header,step-1,step-2,step-3,table-1,table-2,analysis}.png`. Les fichiers de tests sont ignorés par Git ; les trois captures Google intégrées à l’article sont versionnées dans `public/images/blog/fiche-google-institut/`.
- Aperçu local de production : `http://localhost:3253/blog/creer-fiche-google-institut-beaute`. Cet aperçu ne constitue pas un déploiement.

## Test fonctionnel proposé au propriétaire

Ouvrir l’article, suivre le sommaire vers la catégorie, agrandir la capture au clavier ou au toucher, lire le tableau des priorités sur mobile et contrôler les exemples de prestations. Les liens Google ouvrent les procédures officielles ; aucune création de fiche n’est nécessaire pour relire le guide. Le CTA final mène à la démonstration pour institut.

## Risques et retour arrière

Les écrans et catégories Google peuvent évoluer : relire lors d’un changement du parcours. L’article ne garantit ni indexation ni position. Le rendu des figures est optionnel et conserve les dimensions pour limiter les déplacements. Retour arrière par revert du commit de cette PR ; aucun changement de données ni migration à annuler. Merge et déploiement restent soumis à la validation explicite du propriétaire.
