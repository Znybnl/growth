# Guide pratique de la fiche Google pour institut — issue #672

## Résultat et périmètre

- Issue : https://github.com/Znybnl/growth/issues/672.
- Article : `/blog/creer-fiche-google-institut-beaute`, auteur organisationnel « L’équipe Okado », publication datée du 27 octobre 2026, mise à jour et relecture le 28 octobre 2026.
- Intention propre : réaliser la création/revendication, puis configurer et maintenir la fiche. Le guide d’acquisition existant conserve son rôle multicanal et renvoie vers cette procédure.
- Décisions métier inchangées : aucune fiche Google créée, aucun compte marchand ou joueur utilisé, aucune donnée personnelle ajoutée. Le chemin public exact de l’article est ajouté aux listes PostHog autorisées dans les deux applications ; consentement, événements, données collectées et droits restent inchangés.
- Le gabarit accepte des figures locales optionnelles, légendées, datées, accessibles au clavier et ouvrables en taille d’origine. Ce guide active aussi une introduction compacte et trois points d’entrée. Les autres articles gardent leur présentation.

## Améliorations de praticité validées et appliquées le 28 octobre

- Trois parcours vers des ancres explicites : préparation, fiche existante sans accès, fiche déjà validée à compléter.
- Dix étapes opératoires, listes d’actions numérotées et résultats vérifiables. Les recours sont liés au tableau de dépannage.
- Fil conducteur fictif Maison Lueur cohérent : institut d’Angers, accueil sur rendez-vous, description, trois soins avec durées/prix, photos et réservation. Les exemples restent à adapter aux prestations réelles.
- Lien d’avis : procédure officielle « Voir les avis → Recevoir plus d’avis », QR disponible sur ordinateur et contrôle du lien sans publier un faux avis.
- Tableau de dépannage à sept situations avec vérification initiale et aide officielle, puis checklist de neuf points utilisable au clavier.
- UTM repliés dans une option facultative. Aucune donnée de lecture ou de case cochée stockée ni transmise. Sommaire mobile natif repliable ; sommaire desktop à hauteur limitée et défilement interne.
- Couverture décorative retirée du début de cet article ; illustration conservée pour le listing et les métadonnées sociales. Titre, auteur, date de mise à jour et provenance visibles. Les dates de publication/relecture restent dans le registre ; BlogPosting garde les dates prévues par le socle.
- Renvois internes au format de lien déjà autorisé par le gabarit, sans élargir son filtre d’URL. Pas de composant client ni de dépendance supplémentaire.

## Sources et méthode éditoriale

Les 18 liens d’aide Google Business Profile figurent près des étapes et en fin d’article : compte, éligibilité, doublons, nom, catégories, validation, vidéo, services, réservation, photos, avis, lien/QR d’avis, suspension, classement et performances. Les procédures de gestion ont été revérifiées lors de l’itération du 28 octobre. Les intitulés et fonctions peuvent varier selon le compte, la catégorie, le pays et l’état de validation.

Les recommandations propres à Okado sont signalées comme un avis ou une proposition : ordre de priorité, contrôle de l’accès, reportage photo, journal des modifications et analyse des rendez-vous honorés. Aucun témoignage client, performance sectorielle ou expérience de terrain n’est inventé. Les montants et taux du cas de mesure sont explicitement fictifs ; les calculs sont visibles et leurs limites expliquées. La solution Okado est présentée comme une animation indépendante des avis, pas un outil de classement ou de réservation.

Références de méthode SEO/GEO, réservées à ce rapport plutôt qu’ajoutées au guide métier :

- [Google : contenu utile et fiable](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
- [Google : règles antispam](https://developers.google.com/search/docs/essentials/spam-policies).
- [Google : fonctionnalités IA et sites](https://developers.google.com/search/docs/appearance/ai-features).
- [Journal officiel : September 2026 spam update](https://status.search.google.com/incidents/XhUDXP7A67iHCD2kmbVu), du 24 septembre au 8 octobre 2026 (heures US/Pacific).

Il n’existe pas de garantie d’immunité à cette mise à jour. Le travail porte sur une intention distincte, une procédure utilisable, des captures originales, des sources primaires et une analyse explicite, sans bourrage de mots-clés ni multiplication de pages locales. Les paragraphes nomment leur sujet pour rester compréhensibles isolément. Réponse courte, titres descriptifs, FAQ visible, tableaux, liens HTML, dates, canonical, BlogPosting et fil d’Ariane réutilisent le socle existant. Aucun balisage spécial « GEO », FAQPage ou HowTo n’est ajouté pour promettre un résultat enrichi ou une citation IA.

## Provenance des visuels

- Deux captures JPEG originales de l’interface française `https://business.google.com/create?hl=fr`, réalisées le 27 octobre 2026 : recherche et suggestion « Institut de beauté » avec champ du nom visible. La capture redondante du formulaire vide a été retirée.
- Fichiers dans `apps/landing-page/public/images/blog/fiche-google-institut/`, 549 × 672 px ; pas de nom, d’adresse ou de dossier de cliente saisi.
- Seul le champ de catégorie a été renseigné. Aucun clic sur « Suivant » pour enregistrer un établissement ou accepter ses conditions. L’illustration à gauche appartient à Google et n’est pas présentée comme un institut créé par Okado.
- Limite exposée dans l’article : les captures couvrent le démarrage, pas les étapes privées de validation et de gestion d’un établissement réel. Aucune fiche d’institut autorisée n’est disponible pour des captures supplémentaires ; celles-ci restent de côté. Les étapes sont décrites et reliées à l’aide officielle ; aucune interface fictive n’est présentée comme une capture.
- Couverture : diagramme éditorial original en SVG avec dérivé WebP de 1 600 × 800 px, distinct de l’interface Google.

## Vérifications de la première version

- `npm run lint:landing` : succès.
- `npm run build:landing` : succès ; 63 pages précompilées, dont le nouveau guide.
- `npm run test:e2e -w @okado/landing-page -- google-profile-beauty-guide.spec.ts seo-public-pages.spec.ts --grep 'guide Google|tous les articles|sitemap, robots|le blog utilise' --project=desktop --project=mobile` : sept succès ; un test global du blog interrompu par un dépassement de délai et une fermeture de session navigateur pendant une interruption prolongée de l’exécution.
- Relance isolée, sans modification applicative : `npm run test:e2e -w @okado/landing-page -- seo-public-pages.spec.ts --grep 'le blog utilise' --project=desktop --output=test-results/retry-blog-desktop` : succès en 33,2 secondes. Les huit cas sélectionnés sont donc validés.
- Les tests du guide vérifient les trois images chargées, les dates, les originaux JPEG servis, le focus clavier, l’ouverture réelle de la capture en nouvel onglet, les tableaux, la navigation applicable, le CTA et l’absence d’erreur JavaScript/débordement.
- Les tests SEO contrôlent les 35 articles : liens dans le HTML serveur, sources, métadonnées uniques, BlogPosting, fil d’Ariane, dates, sitemap, images sociales et tableaux accessibles. Le blog et les fichiers distribués ont aussi été contrôlés.
- Inspection visuelle réalisée à 1280 × 720 et 390 × 844 : couverture, choix de catégorie et sa légende, tableau de priorités, avis éditorial et CTA. Les tableaux se parcourent horizontalement sur mobile ; les captures se consultent en taille d’origine. Pas de chevauchement ou de débordement de page constaté.
- Captures locales : `apps/landing-page/test-results/google-profile-beauty-guid-fb3f3-ans-débordement-visual-1280-{desktop,mobile}/google-guide-{header,step-1,step-2,step-3,table-1,table-2,analysis}.png`. Les fichiers de tests sont ignorés par Git ; les trois captures Google intégrées à l’article sont versionnées dans `public/images/blog/fiche-google-institut/`.
- Aperçu local de production : `http://localhost:3253/blog/creer-fiche-google-institut-beaute`. Cet aperçu ne constitue pas un déploiement.

## Vérifications de l’itération du 28 octobre

- `npm run lint:landing` : succès.
- `npm run build:landing` : succès, 63 pages précompilées.
- `npm run test:e2e -w @okado/landing-page -- google-profile-beauty-guide.spec.ts seo-public-pages.spec.ts --grep 'guide Google|tous les articles|sitemap, robots|le blog utilise' --project=desktop --project=mobile` : neuf succès en 2,4 minutes. Un cas ignoré intentionnellement sur mobile : le contrôle 1280 × 600 réservé au projet desktop.
- Contrôles du guide : trois liens d’entrée et titres non masqués par la navigation, ouverture/fermeture du sommaire mobile, deux captures et agrandissement réel, UTM repliables, checklist de neuf cases utilisable au clavier, tableaux, CTA, absence d’erreur JavaScript et de débordement global.
- Le contrôle HTML des 35 articles couvre aussi les renvois des nouveaux champs de résultat et de recours. Un premier passage avait détecté des fragments non pris en charge par le rendu éditorial : les liens utilisent désormais le chemin interne complet autorisé. Le passage final est vert, sans assouplissement de la validation des URL.
- Contrôle visuel à 1280 × 720, 1280 × 600 et 390 × 844 : introduction, choix de parcours, captures, trois prestations fictives, dépannage et checklist. Les tableaux restent à défilement horizontal sur mobile. Le sommaire desktop peut défiler dans sa propre zone.
- Relance finale : `npm run test:e2e -w @okado/landing-page -- google-profile-beauty-guide.spec.ts --project=desktop --project=mobile --output=test-results/guide-final` : trois succès en 35,8 secondes, un contrôle 1280 × 600 ignoré intentionnellement sur mobile. Les captures utilisent la préférence de réduction des animations prise en charge par le site, afin de capturer le défilement terminé. Les assertions vérifient le titre de la checklist entièrement dans la fenêtre et sous la navigation fixe.
- Preuves finales inspectées : `apps/landing-page/test-results/guide-final/google-profile-beauty-guid-fb3f3-ans-débordement-visual-1280-{desktop,mobile}/google-guide-{header,checklist,step-1,step-2,table-1,table-2,table-3,table-4,analysis}.png`, ainsi que les captures `google-guide-600-{header,help}.png` du second cas desktop. La checklist montre bien ses cases, le focus et le titre sans recouvrement par le menu.
- Aperçu de production local redémarré et onglet existant actualisé : `http://localhost:3253/blog/creer-fiche-google-institut-beaute`. Les renvois vers le dépannage, les situations et le suivi facultatif ont aussi été constatés dans l’interface.

## Finition du 28 octobre — mobile et analyse des rendez-vous

- Les quatre tableaux de ce guide deviennent des fiches empilées sous 768 px, avec intitulé de ligne puis libellé et valeur de chaque colonne. Une seule table reste dans le HTML, avec caption, en-têtes et rôle explicite ; les libellés visuels répétés sont ignorés par les technologies d’assistance. Sur ordinateur, le rendu en colonnes est conservé ; les autres articles ne prennent pas ce style.
- L’exemple fictif précise que les six créneaux étaient tous passés à la date du bilan : quatre honorés, une annulation et une absence non annoncée. Les rendez-vous futurs sont isolés au lieu d’être assimilés à des absences. Les calculs par clic restent 6/60 et 4/60, avec leurs limites d’attribution.
- La section devient « Améliorer une fiche Google déjà validée ». Deux questions répétées de la FAQ sont retirées, ainsi que des précautions redondantes dans les introductions de la checklist et du dépannage.
- `npm run lint:landing` : succès. `npm run build:landing` : succès, 63 pages précompilées. Correction d’une option de test mal typée détectée par le build : réduction des animations désormais définie dans `contextOptions`, selon les types installés de Playwright.
- Même commande de suite desktop/mobile que ci-dessus : neuf succès en 1,4 minute ; le seul cas ignoré sur mobile est le contrôle desktop 1280 × 600. Les 35 articles conservent les validations HTML, liens, sources et métadonnées.
- Contrôle supplémentaire : `npm run test:e2e -w @okado/landing-page -- google-profile-beauty-guide.spec.ts --grep 'captures lisibles' --project=small-mobile --output=test-results/guide-320` : un succès en 10,8 secondes.
- Les tests vérifient les quatre tableaux sans débordement horizontal à 320/390 px, les cellules entièrement dans la largeur disponible, leurs libellés visibles, les liens de dépannage, le nouveau titre et la précision du cas chiffré. Les autres articles gardent leurs tableaux à défilement horizontal.
- Captures inspectées : prestations et dépannage à 390 px, prestations à 320 px, colonnes conservées à 1280 × 720 et contrôle 1280 × 600. Preuves : `apps/landing-page/test-results/google-profile-beauty-guid-fb3f3-ans-débordement-visual-1280-{desktop,mobile}/google-guide-table-{1,2,3,4}.png` et `test-results/guide-320/google-profile-beauty-guid-fb3f3-ans-débordement-visual-1280-small-mobile/google-guide-table-2.png`.
- L’aperçu existant sur le port 3253 a été redémarré et actualisé ; le titre corrigé et l’exemple précisant l’issue des six réservations ont été vérifiés dans l’interface.

## Test fonctionnel proposé au propriétaire

Choisir « Je gère une fiche validée » et vérifier l’arrivée sur la description. Sur mobile, ouvrir/replier le sommaire, rejoindre les prestations et lire chaque fiche de soin sans défilement horizontal, agrandir une capture puis cocher la checklist. Tester aussi les renvois de dépannage et l’ouverture de l’option UTM. Les liens Google ouvrent les procédures officielles ; aucune création de fiche n’est nécessaire pour relire le guide. Le CTA final mène à la démonstration pour institut.

## Risques et retour arrière

Les écrans et catégories Google peuvent évoluer : relire lors d’un changement du parcours. L’article ne garantit ni indexation ni position. Le rendu des figures est optionnel et conserve les dimensions pour limiter les déplacements. Retour arrière par revert du commit de cette PR ; aucun changement de données ni migration à annuler. Merge et déploiement restent soumis à la validation explicite du propriétaire.

## Vérification du contrôle requis avant merge

- GitHub bloquait la PR car le test PostHog exige que chaque page d’article publiée soit présente dans la liste stricte des URL publiques autorisées. Le nouveau chemin exact manquait dans les deux applications.
- Ajout de `/blog/creer-fiche-google-institut-beaute` aux listes autorisées web-app et landing-page. Les chemins arbitraires restent rejetés et le consentement analytique demeure requis.
- `npm run test:analytics-consent -w @okado/web-app` : 10/10 succès.
- `npm run lint:web` : succès, quatre avertissements préexistants sur `window.location.assign` dans des composants d’inscription/emplacement, sans erreur.
- `npm run build:web` : succès, 81 routes générées.
