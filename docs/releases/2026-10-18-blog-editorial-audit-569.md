# Optimisation des 20 articles — issue #569

## Résultat et périmètre

Les recommandations de l’audit éditorial du 18 octobre 2026 sont appliquées aux
20 articles de `apps/landing-page/src/lib/blog.ts`. L’intention d’acquisition de
chaque article est conservée. Les ajouts apportent des décisions, des exemples ou
des précisions utiles ; aucun seuil de mots ni classement garanti n’est revendiqué.

Les deux derniers articles et leurs illustrations viennent des PR empilées #566
et #567, encore ouvertes au début de cette intervention. La branche d’optimisation
part de #567 et conserve ces deux articles pour vérifier le catalogue complet.
La PR d’optimisation doit être relue après intégration de ces dépendances.

## Application article par article

| # | Article (slug) | Modifications appliquées |
|---:|---|---|
| 1 | idees-animations-commerciales-boutique | Matrice objectif/activité/effort ; trois scénarios explicitement illustratifs ; liens vers les sujets sectoriels et promotions ; référence sur les loteries ; titre SEO raccourci. |
| 2 | animer-point-de-vente-qr-code | Lisibilité, zoom, clavier, adresse alternative et assistance à préparer ; périmètre de la référence W3C précisé ; lien vers la checklist d’affiche. Le parcours sans application correspond à PRODUCT. |
| 3 | idees-jeux-concours-restaurant | Exemple familial adressé à l’adulte sans collecte auprès de l’enfant ; organisateur, sélection, pays et remise à préciser ; tirage différé distingué des fonctionnalités d’Okado ; source DGCCRF. |
| 4 | animation-commerciale-institut-beaute | Positionnement adapté à tous les instituts ; contrôle des prestations, précautions et disponibilités ; aucune promesse esthétique ou médicale ; données de santé exclues du formulaire marketing ; source CNIL. |
| 5 | jeu-concours-ou-promotion | Tableau objectif/bénéfice/effort/mesure/friction ; deux références DGCCRF contextualisées ; liens produit et tarifs. |
| 6 | fideliser-clients-sans-programme-points | Test sur 30 jours avec preuve du retour et suivi des échéances ; distinction invitation physique/courriel ; source CNIL sur la prospection. |
| 7 | idees-promotions-commerce-local | Distinction promotion certaine/animation ; tableau marge/stock/effort/objectif ; vérification du prix de référence avec la DGCCRF ; réponse courte sans affirmation de performance. |
| 8 | experience-client-boutique | Cinq critères observables ; exemple avant/après sans résultat inventé ; liens vers QR et fidélisation ; source W3C sur les textes numériques. |
| 9 | calendrier-marketing-commerce-local | Tableau trimestriel par activité ; périmètre France métropolitaine explicite ; contrôles annuels et territoriaux ; fiche événement fictive ; référence sur les annonces de réduction. |
| 10 | attirer-clients-commerce-local | Rôle de page pilier clarifié par un diagnostic et des liens vers les sujets spécialisés ; références Google Business Profile et CNIL pertinentes pour visibilité locale et invitations électroniques. |
| 11 | roue-ou-ticket-a-gratter-commerce | Matrice accessible sans supériorité de performance inventée ; liens vers les deux mécaniques ; rappel du champ français de la source DGCCRF ; titre SEO raccourci. |
| 12 | cout-animation-commerciale-commerce | Deux budgets fictifs détaillés (80 € et 350 € hors outil et autres coûts) ; quantités, coûts horaires et lots identifiés comme hypothèses ; lien vers les tarifs réels ; absence de double comptage des remises ; référence sur leur affichage. |
| 13 | mesurer-animation-commerciale | Vrais liens ; exemple chiffré fictif avec dénominateurs, événements/personnes, coût par opt-in et formule de ROI conditionnelle ; source CNIL pour distinguer contact et accord marketing. |
| 14 | animer-periode-creuse-commerce-local | Vrais liens ; protocole d’observation et comparaison ; suivi des créneaux voisins pour identifier un déplacement de demande ; description raccourcie ; référence de prix contextualisée. |
| 15 | faire-revenir-clients-animation | Vrais liens ; invitation sur place/courriel, exceptions légales et règles du produit distinguées ; pas de séquence automatique revendiquée ; retour observé séparé du retrait le jour même ; source CNIL. |
| 16 | animation-lancement-nouveau-produit | Vrais liens ; relecture croisée avant lancement et après changement ; information/essai/offre/jeu séparés ; contrôle du stock et retrait des supports ; source DGCCRF si réduction. |
| 17 | animation-marketing-multi-sites | Vrais liens ; correction de la FAQ ambiguë : un jeu rattaché à un établissement dans Okado ; brouillons indépendants et absence de propagation automatique ; tableau lancement/repli ; accès et consentement non mutualisés implicitement ; titre SEO raccourci. |
| 18 | affiche-qr-code-animation-commerciale | Vrais liens ; adresse publique alternative, zoom et contraste numérique ; restrictions essentielles visibles sur l’affiche ; référence W3C distincte d’une norme de taille de QR. |
| 19 | jeu-concours-evenement-local | Vrais liens ; organisateur, partenaires, sélection et pays clarifiés ; distinction loterie publicitaire/tombola ; sources DGCCRF et CNIL ; description raccourcie. |
| 20 | collecter-contacts-magasin-consentement | Vrai lien ; information/base légale/choix marketing distingués ; exceptions de prospection et contexte français ; pas de consentement de service inventé ; introduction nuancée sur les champs nécessaires ; deux sources CNIL ; titre SEO raccourci. |

## Gabarit et SEO technique

- Les liens éditoriaux sont rendus côté serveur comme de vrais éléments `a`.
  Le parseur ne prend en charge que les liens : aucun HTML éditorial injecté et
  aucune nouvelle dépendance. Les liens externes acceptent HTTPS sans identifiants.
- Les tableaux ont une légende, des en-têtes de colonnes/lignes et une zone de
  défilement accessible au clavier. Le débordement reste local au tableau.
- Les sources métier sont sélectionnées pour chaque article et affichées dans
  « Sources et références ». Aucun lien Search Central générique n’est ajouté aux
  articles destinés aux commerçants.
- Le fil visible et le `BreadcrumbList` suivent Okado → Blog → titre de l’article.
  Les autres pages conservent leur comportement.
- Les dates de modification et de relecture passent au 18 octobre 2026 ; les dates
  de publication initiales sont conservées. Le sitemap utilise la date propre à
  chaque article. L’interface montre la date de mise à jour.
- Les temps de lecture sont recalculés à environ 220 mots/minute sur le texte
  éditorial, titres et tableaux compris, sans compter les destinations des liens.
- Les 20 illustrations existantes et leurs alternatives restent associées aux
  articles. Les titres SEO courts n’altèrent pas les H1.
- `BlogPosting`, canonical, description, images Open Graph/Twitter et auteur
  organisationnel restent cohérents avec le contenu visible.

## Références utilisées

Sources métier vérifiées le 18 octobre 2026 : CNIL (consentement et prospection),
DGCCRF (loteries publicitaires et réductions), W3C (contraste du texte numérique),
Google Business Profile (visibilité locale). Les références françaises sont
explicitement contextualisées ; elles ne certifient pas une opération au Canada
ou dans un autre pays.

Référence de méthode SEO/GEO, réservée au suivi technique :
https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?version=published

## Vérification et recette

Le test `seo-public-pages.spec.ts` est enrichi pour parcourir les 20 articles sur
les quatre résolutions du projet : liens présents dans le HTML serveur, absence
de Markdown brut visible, sources, titres/descriptions, images sociales, dates,
auteur, trois niveaux de fil d’Ariane, sitemap et absence de débordement global.
Les tableaux sont vérifiés pour leur sémantique et leur accès au clavier.

Vérifications finales :

- `npm run lint:landing` : réussi, sans avertissement.
- `npm run build:landing` : réussi, TypeScript inclus, 48 pages générées.
- `npm run test:e2e -w @okado/landing-page -- e2e/seo-public-pages.spec.ts` :
  **28 tests réussis en 2,5 minutes**, aux largeurs 320, 390, 768 et 1440 px.
- `git diff --check` : réussi.
- Captures du tableau de budget sur ordinateur et à 320 px et du tableau
  d’animations à 390 px inspectées : texte lisible, défilement horizontal local,
  pas d’élargissement de page.

Le premier passage avait 24 réussites et quatre échecs du nouveau test : son
assertion de sitemap attendait à tort une date avec heure. L’assertion a été
corrigée pour la date ISO effectivement fournie, puis la suite complète relancée.

Recette propriétaire : ouvrir le comparatif roue/ticket, les exemples de budget,
le déploiement multi-sites et la collecte de contacts ; vérifier les liens et le
défilement des tableaux sur téléphone. Cette recette ne nécessite aucune donnée
client ni envoi de courriel.

## Livraison et retour arrière

Changement limité au blog public et à son balisage. Pas de migration, de nouvelle
variable d’environnement ni de modification du parcours des joueurs. La checklist
React a conduit à conserver le rendu serveur, les contenus échappés et les liens
et tableaux accessibles, sans JavaScript client supplémentaire.

Retour arrière : revert du commit d’optimisation, puis reconstruction de la
landing. La production reste soumise à la validation du propriétaire.
