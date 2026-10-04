# Produit — Okado

## Fiche d'identité

- **Problème résolu** : permettre à un commerce local de concevoir, diffuser et piloter simplement un jeu en point de vente afin d'animer sa clientèle, collecter des contacts et encourager des actions marketing.
- **Utilisateurs cibles** : responsables de commerces de proximité et de restauration, leurs équipes en point de vente, et les clients qui participent aux jeux.
- **Promesse principale** : créer un jeu mobile prêt à diffuser par QR code, attribuer des lots et suivre les résultats sans complexité opérationnelle.
- **Hors périmètre actuel** : caisse/POS, gestion de paiement des clients du commerce, programme de fidélité généraliste et diffusion publicitaire.
- **Responsable produit et unique valideur des PR** : Pierre-Henri BRUNELLE.

## Parcours principaux

### P-01 — Créer et publier un jeu

- **Acteur** : marchand.
- **Déclencheur** : le marchand souhaite lancer une animation locale.
- **Résultat attendu** : un jeu brouillon ou actif est enregistré avec son type de jeu, ses lots, ses règles et ses actions marketing.
- **Mesure de réussite** : le jeu est prévisualisable avant diffusion et publiable uniquement lorsque les éléments obligatoires sont valides.

### P-02 — Participer à un jeu depuis un QR code

- **Acteur** : client.
- **Déclencheur** : le client scanne le QR code de diffusion du jeu.
- **Résultat attendu** : il effectue, lorsque prévue, l'action marketing de sa visite, participe au jeu et reçoit le résultat.
- **Mesure de réussite** : la participation est comptabilisée une seule fois et respecte le délai entre deux participations.

### P-03 — Collecter un contact

- **Acteur** : client puis marchand.
- **Déclencheur** : la collecte d'e-mail avant le jeu est activée, ou le client remporte un lot nécessitant l'envoi d'un e-mail.
- **Résultat attendu** : les coordonnées et le consentement applicable sont enregistrés puis visibles dans les résultats du marchand.
- **Mesure de réussite** : aucune collecte marketing n'est réalisée sans le consentement requis.

### P-04 — Attribuer et retirer un lot

- **Acteur** : client et personnel du commerce.
- **Déclencheur** : un client remporte un lot puis le présente au commerce.
- **Résultat attendu** : le personnel consulte le lot, vérifie ses conditions, saisit le PIN marchand et valide le retrait.
- **Mesure de réussite** : un retrait est journalisé, non rejouable et les exceptions de validité sont explicites.
- **Réception du gain (Issue #449)** : après un gain, le formulaire propose « Recevoir mon gain » (20 px, graisse 700) et présente les conditions d’utilisation du lot sous ce bouton. Après un enregistrement réussi, il ouvre directement la confirmation détaillée, sans étape « Suivant ». Si les coordonnées ont été saisies avant le jeu via la collecte d’e-mail, l’annonce du gain avec « Suivant » est conservée avant cette confirmation. Cette règle s’applique à la roue et au ticket, en jeu réel et en prévisualisation ; un échec d’enregistrement ne permet pas d’accéder à un gain confirmé. La confirmation « Votre gain est confirmé ! » annonce « Vous allez recevoir votre gain par e-mail (vérifiez vos spams). », regroupe les dates et conditions de retrait, puis présente le QR code avec « Enregistrer mon QR code » et « Présentez ce QR code lors de votre rendez-vous. », sans mention supplémentaire « Conservez ce QR code… ». Le code de retrait reste disponible, plus discret, en bas. Cette présentation ne modifie ni l’attribution, ni le consentement, ni l’envoi de l’e-mail.

### P-05 — Prévisualiser sans impact métier

- **Acteur** : marchand.
- **Déclencheur** : le marchand ouvre la prévisualisation ou son QR code de prévisualisation.
- **Résultat attendu** : il teste le parcours complet, y compris l'e-mail de gain, sans modifier les stocks ni les indicateurs de production.
- **Mesure de réussite** : les participations de prévisualisation restent isolées des données de production.

### P-06 — Piloter plusieurs établissements

- **Acteur** : marchand disposant de plusieurs établissements.
- **Déclencheur** : le marchand bascule de site ou déploie un jeu sur plusieurs sites.
- **Résultat attendu** : les données, réglages et accès restent correctement rattachés à chaque établissement.
- **Mesure de réussite** : aucun établissement ne peut modifier ou consulter les données d'un autre sans autorisation.

## Priorités produit actuelles

- **Maintenant** : fiabilité des parcours marchand, client et retrait ; cohérence du wizard de création ; sécurité et lisibilité des données.
- **Ensuite** : réduire progressivement l'écart entre le formulaire classique et le wizard afin de faire du wizard le parcours de référence.
- **Indicateurs suivis** : scans, participations, contacts collectés, actions marketing réalisées, retraits, taux de conversion et coût par lead.

## Décisions produit confirmées

- Les pages marketing Accueil, Restaurants et Instituts de beauté partagent le logo étoile Okado et une FAQ expliquant que les actions Instagram/Google sont configurées par les liens de l'établissement, sans connexion de ces comptes à Okado ni demande de mot de passe ou d'autorisation d'accès (Issue #452). Cette information ne concerne pas la connexion optionnelle à l'espace marchand avec Google.
- Lors de l’initialisation d’un nouveau ticket à gratter, le template par défaut est **Nude Élégance** pour le secteur Beauté, et **Nude** pour les autres secteurs (y compris un secteur non renseigné). Un template déjà enregistré ou un choix déjà effectué n’est pas remplacé (Issue #441 / PR #442).
- Une animation créée et pilotée par un marchand est un **jeu**. La rubrique de navigation qui regroupe ces jeux s’intitule **Campagnes** ; *campagne* reste aussi le terme technique/historique du modèle de données.
- Les actions marketing sont proposées **avant** le jeu et sont séquencées par visite.
- La collecte d'e-mail est une option indépendante des actions marketing.
- L'objectif de création sert à initialiser les actions dans le wizard ; il ne doit pas écraser les actions d'un jeu existant.
- Un brouillon peut être sauvegardé incomplet ; la publication est bloquée tant que les éléments requis sont invalides.
- La prévisualisation est isolée : elle ne décrémente pas les lots et ne nourrit pas les indicateurs de production.
- Seul l'administrateur de la plateforme accède aux fonctionnalités qui lui sont dédiées. Les utilisateurs marchands pilotent leurs propres établissements et jeux.
- Le personnel du commerce n'a pas de compte dédié à la plateforme : il valide un retrait depuis le QR code du client avec le PIN marchand.
- Le formulaire classique ne peut être supprimé qu'après reprise fonctionnelle suffisante dans le wizard et validation des parcours de bout en bout, à la fois par le propriétaire et par les tests automatisés.
- Le secteur d'activité d'un établissement n'est pas prérempli pour un nouveau profil et peut rester vide ; les choix déjà enregistrés pour les établissements existants sont préservés.
- Le secteur Beauté propose les sous-secteurs Coiffure, Institut & soins, Ongles & cils, et Massage & spa. Les suggestions de lots peuvent être ciblées par sous-secteur ; tant qu'un catalogue dédié n'est pas configuré, le catalogue Beauté général reste disponible en repli.
- Les établissements du secteur Beauté disposent de six styles de roue supplémentaires, quel que soit leur sous-secteur. Cette collection apparaît avant les modèles génériques dans les éditeurs ; les joueurs voient le modèle enregistré sans restriction de secteur. Le logo, le titre, le sous-titre, les couleurs et la police restent personnalisables. Les centres JOUER de cette collection et d'Éclat sont sans icône, avec une police agrandie et un reflet discret en haut à gauche (issue #460). L'interaction du bouton reste identique.

## Fonds Rose poudré et remplacement Noir & Or — issues #462 / #463

Rose poudré utilise par défaut une image raster de satin rosé et de pétales sur les bords ; ses couleurs, segments, centre et textes ne changent pas. Noir & Or remplace le nom et l’habillage d’Éditorial chic, tout en conservant l’identifiant `beauty-editorial` : fond du ticket Noir & Or Signature, titre champagne, logo/sous-titre ivoire, roue noire/ivoire/or et contours dorés. Les nouveaux choix sont centrés ; les alignements déjà mémorisés restent prioritaires. Les miniatures reprennent ces fonds et palettes.

Les images natives sont résolues à l’affichage, jamais enregistrées comme un choix marchand. Une image manuelle ou une couleur de fond explicitement enregistrée différente du nouveau défaut reste prioritaire. Ainsi une ancienne campagne Éditorial chic avec fond ivoire enregistré n’est pas convertie silencieusement en fond sombre, ce qui préserve la lisibilité de ses textes sombres ; sélectionner le nouvel habillage sur une campagne sans réglages mémorisés propose Noir & Or. Aucun changement du moteur de jeu, des lots, des probabilités ou des tickets à gratter.

## Finitions des roues Beauté — issue #460

Les six thèmes Beauté et Éclat partagent une finition de disque central en relief, sans icône, avec JOUER en DM Sans. Après le retour propriétaire sur la PR #461, JOUER est réduit de 1 px (16–27 px), le filet blanc intérieur du bouton est supprimé et remplacé par un contour assombri et une ombre douce. Les libellés des lots utilisent également DM Sans, graisse 600, sans modifier leur orientation relative aux segments ni leur taille minimale. Le contour coloré est renforcé de 1 px et suivi d'un liseré blanc extérieur de 2 px, sans anneau coloré extérieur en doublon. Les pointeurs gardent leur ancrage et bénéficient d'un dégradé/reflet et d'une ombre douce. Un filet fin suit le logo uniquement en mode texte ; il est absent en mode image et sans logo. Les diamètres des centres, palettes, réglages de textes/espacements, fonds et mécanique de jeu sont préservés. Les miniatures reprennent les mêmes finitions.

## Fonds des roues Nude & Or et Botanical — issue #458

Les roues **Nude & Or** et **Botanical** utilisent par défaut les images raster des tickets **Nude Élégance** et **Botanique Premium** (issue #458), y compris leurs miniatures. Ce fond natif est résolu à l'affichage, sans enregistrer d'URL dans les réglages utilisateur. Une image importée ou choisie dans la bibliothèque le remplace sans assombrissement ni décor SVG superposé ; une couleur de fond personnalisée différente du défaut reste également effective. Aucun changement au mécanisme de roue ni aux autres templates.

## Roue Halloween dorée — issue #456

- Modèle générique disponible pour tous les secteurs, dans le wizard et l’éditeur classique : `halloween-gold`.
- Le logo (texte, image ou aucun), le titre, le sous-titre, les polices, tailles, alignements et espacements restent configurables. Bodoni est la police initiale du titre ; les marges de chaque modèle sont mémorisées/restaurées.
- Le décor raster, les dorures du titre, la mention « Spécial Halloween », les couleurs et le traitement de la roue sont fixes. Aucun pictogramme dans le bouton central JOUER.
- Six secteurs alternés noir/or reprennent la référence. Les pictogrammes sont décoratifs, pas une promesse de lot : les vrais lots, probabilités, résultat serveur, action marketing et parcours de gain ne changent pas. Si plus de six résultats distincts sont configurés, le rendu s’étend au nombre pair nécessaire pour ne masquer aucun lot.
- Le même rendu sert à la page de jeu, la prévisualisation mobile et l’aperçu intégré. Les assets locaux sont versionnés et ne dépendent pas d’un fichier présent uniquement sur le poste du développeur.
- La composition affinée utilise une roue de 82 % de la largeur, des anneaux fins et une microtexture métallique. À la demande du propriétaire du 4 octobre, les espacements initiaux sous le logo et avant la roue utilisent désormais la valeur commune des roues, 50 px. Les valeurs déjà enregistrées, y compris 0 px, et les réglages des autres templates restent préservés.
- Les assets raster Halloween doivent être inclus explicitement dans `.vercelignore` ; leur présence dans Git ou sur le serveur local ne prouve pas leur présence sur Vercel. Contrôler les URL statiques et optimisées sur le déploiement candidat.
- Le sous-titre Halloween utilise la teinte dorée fixe `#efb866`, indépendamment de la couleur du logo, et une largeur centrée de 60 %. Le décor de l’aperçu compact remplit toute la hauteur de l’écran interne du téléphone ; le diamètre et les proportions de roue ne sont pas étirés pour remplir cette hauteur.
- Le logo texte Halloween est blanc fixe (`#ffffff`), même avec une ancienne couleur sauvegardée. Le sélecteur « Couleur du logo et sous-titre » est blanc, désactivé et accompagné du badge « Palette fixe » ; une aide précise que le sous-titre reste doré. Les images de logo ne sont pas recolorées et les réglages enregistrés des autres modèles restent personnalisables.
- Preuves visuelles, provenance des images et grille de correspondance : [dossier de validation](design/halloween-wheel-456.md). Validation du propriétaire requise avant merge/déploiement.

## Questions ouvertes

- [ ] Définir les critères de retrait forcé à afficher et à journaliser pour le personnel du commerce.
- [ ] Définir précisément le seuil de parité fonctionnelle du wizard qui déclenchera le retrait du formulaire classique.
- [ ] Valider les règles de conformité restantes dans `docs/DOMAIN_RULES.md` (consentement, conservation des données et preuves associées).
