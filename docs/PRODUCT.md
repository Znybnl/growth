# Produit — Okado

## Libellés de roue longs — #631

Dans le rendu partagé de la roue, un libellé qui manque de place dans son
secteur réduit uniquement sa propre taille de police. Les textes qui tiennent
conservent leur taille de référence. Le calcul utilise les dimensions SVG
réelles, le dégagement du bouton central, le bord et l'angle du secteur ;
aucun étirement horizontal ni modification du libellé enregistré, des chances
ou du tirage. Même composant pour la page de jeu et les aperçus.

## Refonte Beauty Pop — #626

La roue `beauty-pop` adopte un fond raster rose/fuchsia avec rubans, cadeaux
et reflets dorés, disponible aussi dans la bibliothèque. Le fond natif est
résolu à l'affichage ; une image manuelle ou une couleur de fond personnalisée
reste prioritaire et n'est pas propagée aux autres modèles. Les nouveaux choix
proposent Bodoni, un titre fuchsia et un logo/sous-titre prune. Les polices,
couleurs et espacements déjà mémorisés restent prioritaires ; aucun jeu n'est
réécrit en base. Le bouton brillant et les segments restent sans icône.
Les libellés utilisent la présentation radiale des autres roues Beauté ;
le sous-titre est resserré au centre, loin des rubans latéraux.
Le contour lumineux reste fixe pendant la rotation.
Le tirage, les lots configurés, les probabilités et le retrait sont inchangés.
[Référence, provenance et vérifications](design/beauty-pop-626.md).

## Téléchargements marchands — #596

Un clic sur un téléchargement QR de diffusion, affiche PNG ou export CSV ouvre
immédiatement une popin : préparation explicite, erreur/réessai ou transmission
du fichier au navigateur (pas une promesse de sauvegarde sur le disque).
Le QR est d’abord présenté comme une image scannable et enregistrable par clic
droit ; seul son bouton lance le téléchargement. Un brouillon reste identifié
comme à diffuser après publication. Le QR de prévisualisation reste séparé.
Les affiches modifiées conservent leur confirmation d’enregistrement préalable.
Fermer interrompt la préparation côté navigateur et empêche un téléchargement
tardif ; cela n’annule pas une sauvegarde déjà effectuée sur le serveur.
Les mêmes contrôles serveur s’appliquent au marchand et à l’administration.
La popin QR remplace temporairement Jeu prêt, sans empiler les fenêtres.

## Relance avant expiration — #304

Mon compte → Utilisateur affiche un réglage commun à tous les établissements : case décochée par défaut et nombre de jours avant expiration, initialement 7. Seul propriétaire/administrateur du compte peut sauvegarder ; les membres actifs consultent sans écrire. L’e-mail de service reprend le format du gain initial et est destiné au gagnant : une seule relance le jour civil J−N au passage quotidien, sans rattrapage d’un jour passé. Le propriétaire confirme le 12 octobre que 9 h est approximatif : planification Vercel Hobby, envoi Resend existant, aucun secret ou job Supabase à configurer. Les notifications personnelles de gains et leurs fréquences restent indépendantes. [Périmètre, horaires indicatifs et recette](releases/reward-expiry-reminders-304.md).

## Notifications de gains au marchand (Issues #473 et #484)

Décision propriétaire : réglage dans **Mon compte → Utilisateur**, personnel et par établissement, **désactivé par défaut** pour les comptes existants et nouveaux. L’utilisateur peut cocher indépendamment une ou plusieurs options : à chaque gain, synthèse quotidienne (conseillée), hebdomadaire et/ou mensuelle. Un même gain peut donc figurer dans chacune des synthèses choisies et générer en plus son alerte immédiate si elle est activée. Le destinataire est l’e-mail actuel du compte, pas celui du joueur ni une adresse libre.

Dans Pilotage → Voir la fiche, l’administrateur consulte toutes les options actives et la date de modification du compte de la ligne pour le site sélectionné. Cette consultation reste en lecture seule, sans activation ni création de préférence ; l’absence de préférence affiche « Aucune (désactivées par défaut) ». Les sites et réglages d’un autre utilisateur ne sont pas mélangés, même au sein du même compte marchand. Une erreur de lecture est signalée et ne devient jamais un faux statut désactivé.

- Gains réels des roues et tickets seulement ; pertes et prévisualisations exclues. Activation non rétroactive.
- Décision propriétaire : synthèses lors d'un passage quotidien le matin (heure de France, horaire indicatif), sans garantie d'envoi exactement à 9 h ni changement de forfait. Veille / semaine précédente / mois précédent, selon le calendrier local du site ; aucun e-mail sans gain. Une exécution retardée rattrape les périodes closes. Les alertes à chaque gain restent envoyées après confirmation, sans attendre ce passage.
- Le listing complet est **directement dans l’e-mail**, une ligne par gain : date/heure locale, prénom et nom du participant, jeu, lot, et une seule colonne « Expiration / retrait ». Elle affiche « Récupéré » si le lot est retiré ; sinon sa date d’expiration, ou « Sans date d’expiration ». La date n’est jamais affichée pour un gain déjà récupéré. Au-delà de 40 lignes, plusieurs e-mails numérotés couvrent toute la période. Retour propriétaire du 6 octobre : les noms sont également présents dans l’alerte immédiate ; une identité absente n’est jamais déduite de l’e-mail. Pas d’e-mail du joueur, QR ou code de retrait ; le bouton Résultats exige une connexion et les droits sur le site.
- Chaque synthèse comporte aussi le KPI « Lots récupérés pendant la période », calculé par date effective du retrait (`redeemed_at`) et non par date de gain : un lot remporté précédemment mais retiré pendant la période est compté. Un bloc séparé liste le jeu, le lot et son stock courant pour les campagnes actives de l’établissement, distingue « Illimité » et signale clairement un stock épuisé. Ces instantanés sont figés avec le contenu de l’e-mail préparé.
- Aucun logo Okado dans les messages ; le nom de l’établissement identifie le site. Les synthèses utilisent « Les gains » et un objet précisant la journée, la semaine ou le mois réellement couverts. Le pied de page permet de modifier les options de fréquence ou de désactiver les notifications dans Mon compte, avec un lien authentifié vers le bon établissement.
- Chaque canal est indépendant et non rétroactif : ajouter une option ne réinjecte pas dans ce canal les gains antérieurs à son activation. Les jobs déjà préparés gardent leur fréquence et leur contenu pour les reprises. Désactiver une option annule ses envois en attente sans affecter les autres ; un e-mail accepté par le fournisseur ne peut pas être rappelé.
- L’alerte immédiate et les synthèses sont distinctes de l’e-mail de gain du joueur. Aucun changement au tirage, au stock, au retrait ou au consentement du participant.

## Présentation du site public — #601, 19 octobre 2026

Le site met en premier le bénéfice « donner une raison de revenir », avec une
description explicite des roues et tickets par QR code. Il s'adresse à plusieurs
secteurs : Beauté/bien-être, restauration et commerces locaux. Ce positionnement
ne crée ni programme de points ni promesse de visite ou de revenu supplémentaire.
La galerie présente de vrais rendus des modèles du produit sur données fictives,
en précisant les collections et les limites des personnalisations. Suite #607,
l’accueil montre des modèles Beauté, restaurant et boutique et propose un choix
de ces trois activités dans la démo locale. L’exemple Boutique utilise un ticket
à gratter, accessible aussi au clavier. Les six spécialités Beauté illustrent
les suggestions existantes ; leur CTA adapte un lot du parcours Beauté commun,
sans créer de campagne ni promettre une démo indépendante par spécialité.
Suite #608 : sur la page Beauté, le hero ne double plus le téléphone de la démo
et le rappel tarifaire suit celle-ci. La démo réutilise l’image satinée à pétales
du modèle produit Rose poudré (#462), pas seulement ses couleurs. Les mentions
explicatives retirées dans #605 restent absentes ; l’indication de simulation
reste hors du téléphone. Les modèles et les spécialités restent consultables.
Les idées restaurant/boutique sont des exemples à saisir, pas l’annonce d’une
nouvelle bibliothèque automatique. L’accueil présente le suivi de manière compacte ; les
synthèses et relances détaillées restent dans la page Beauté et l’aide publique.
L’offre publique reste 30 jours d’essai sans carte puis 20 € HT/mois en France,
sans engagement, avec les lots à la charge de l’établissement.

## Fiche d'identité

- **Problème résolu** : permettre à un commerce local de concevoir, diffuser et piloter simplement un jeu en point de vente afin d'animer sa clientèle, collecter des contacts et encourager des actions marketing.
- **Utilisateurs cibles** : responsables de commerces de proximité et de restauration, leurs équipes en point de vente, et les clients qui participent aux jeux.
- **Promesse principale** : créer un jeu mobile prêt à diffuser par QR code, attribuer des lots et suivre les résultats sans complexité opérationnelle.
- **Hors périmètre actuel** : caisse/POS, gestion de paiement des clients du commerce, programme de fidélité généraliste et diffusion publicitaire.
- **Responsable produit et unique valideur des PR** : Pierre-Henri BRUNELLE.

## Parcours principaux

### Aperçu d'un jeu partagé

Les métadonnées de la page publique destinées aux aperçus sociaux associent le nom de l'établissement et la promesse visible du jeu dans le titre. La description reprend le sous-titre secondaire configuré pour la roue ou le ticket à gratter. Si l'un de ces textes est absent, il est omis du titre ou la description générique de la plateforme est conservée ; les prévisualisations privées ne publient pas les textes d'un brouillon.

### P-01 — Créer et publier un jeu

Bibliothèque de lots — #609 phase 3 : « Trouver des idées de lots » propose
Suggestions (par défaut) et Mes lots. Ce second onglet permet de copier les
récompenses des autres jeux de l'établissement actif, ou de l'établissement
assisté dans l'éditeur administrateur. Le stock initial limité est proposé à
confirmation et les copies sont indépendantes. Le jeu en cours est exclu de
l'historique ; aucun lot PERDU n'est créé.

Phase 4 : l’onglet Compositions propose Budget maîtrisé, Équilibré et Généreux
depuis le même catalogue actif de l’activité. Le marchand consulte les lots,
leurs chances et le coût moyen théorique indicatif avant application.
La composition reste un brouillon modifiable ; si des lots existent, un écran
de confirmation exige « Remplacer les lots ». Annuler n’altère rien.
L’option 100 % gagnant et les autres paramètres restent inchangés.
Phase5 : Budget estimé des gains affiche le coût moyen théorique par participation
et la projection pour100. Un coût inconnu produit une estimation incomplète,
avec accès au lot à renseigner, sans bloquer sa configuration. Les règles
regroupées conservent leurs valeurs et signalent les saisies hors limites.
L’état sans lot propose directement Compositions, Suggestions et création
manuelle ; Mes lots reste accessible. Aucun budget réel garanti selon les stocks
ou les retraits ; aucun simulateur de trafic personnalisé n’est ajouté.

- **Acteur** : marchand.
- **Déclencheur** : le marchand souhaite lancer une animation locale.
- **Résultat attendu** : un jeu brouillon ou actif est enregistré avec son type de jeu, ses lots, ses règles et ses actions marketing.
- **Mesure de réussite** : le jeu est prévisualisable avant diffusion et publiable uniquement lorsque les éléments obligatoires sont valides.

#### Présentation responsive du wizard — #600

Les actions Retour aux jeux, Enregistrer et Publier (selon l’étape et le mode)
restent accessibles dans une barre supérieure fixe au défilement, y compris
sur petit écran. La progression verticale mesure 250 px sur grand écran ; les
formats horizontal et compact sont conservés lorsque la place diminue.
La promesse et le sous-titre de roue affichent trois lignes de saisie par
défaut ; cette hauteur ne tronque pas les textes Beauté déjà autorisés.

L’aperçu du brouillon utilise un viewport CSS mobile utile de 390 × 740 px, commun
à la prévisualisation interactive, puis une mise à l’échelle du téléphone
entier. Les textes et les composants de roue gardent leurs dimensions mobiles,
indépendantes de l’écran du marchand. La hauteur de référence réserve une place
au navigateur mobile sans en dessiner l’interface ; elle n’impose aucune taille
à la vraie page de jeu. Le cadre du wizard ne dépasse pas 260 px de large.
Le sous-titre de roue est augmenté de 2 px dans les rendus public et aperçu,
en conservant les adaptations typographiques de chaque thème.
Cet aperçu visuel utilise uniquement
le brouillon en mémoire et n’effectue aucune participation ni sauvegarde.
Le bouton Voir l’aperçu reste disponible lorsque le téléphone ne tient pas
dans la colonne. Le libellé Aperçu en direct et l’action Agrandir sont retirés.
Les cartes de modèles Beauté et classiques partagent cadre, hauteur de visuel,
légende, sélection et mise au point clavier.

### P-02 — Participer à un jeu depuis un QR code

- Assistance administrative (issue #470) : « QR de diffusion » dans Pilotage → Voir les jeux, puis téléchargement dans le Wizard administrateur et après son enregistrement. Ce fichier SVG mène au jeu public du bon établissement ; le « QR de test » reste séparé. Un brouillon reste non publié et un avertissement demande d’attendre sa publication avant diffusion. Le bouton signale le téléchargement en cours et affiche une erreur en cas d’accès refusé ou de connexion interrompue, sans enregistrer un fichier JSON/HTML à la place du QR.

- **Acteur** : client.
- **Déclencheur** : le client scanne le QR code de diffusion du jeu.
- **Résultat attendu** : il effectue, lorsque prévue, l'action marketing de sa visite, participe au jeu et reçoit le résultat.
- **Mesure de réussite** : la participation est comptabilisée une seule fois et respecte le délai entre deux participations.
- #496 : les perdants sans coordonnées et les gagnants qui abandonnent le formulaire restent des participations. Le scan est une ouverture, pas une partie ; le ticket compte au premier grattage. Les écrans Accueil, Campagnes, Résultats et leurs courbes/sélecteurs utilisent les parties, tandis que « Contacts récents » et les exports restent limités aux saisies.

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
- **Réception du gain (Issues #449 / #558)** : après un gain, le formulaire propose « Recevoir mon gain » (20 px, graisse 700). La première popin « Félicitations ! Vous avez remporté… » n’affiche pas de bloc de conditions d’utilisation (#558) ; les conditions restent disponibles dans la confirmation détaillée, le retrait et l’e-mail. Après un enregistrement réussi, il ouvre directement la confirmation détaillée, sans étape « Suivant ». Si les coordonnées ont été saisies avant le jeu via la collecte d’e-mail, l’annonce du gain avec « Suivant » est conservée avant cette confirmation. Cette règle s’applique à la roue et au ticket, en jeu réel et en prévisualisation ; un échec d’enregistrement ne permet pas d’accéder à un gain confirmé. La confirmation « Votre gain est confirmé ! » annonce « Vous allez recevoir votre gain par e-mail (vérifiez vos spams). », regroupe les dates et conditions de retrait, puis présente le QR code avec « Enregistrer mon QR code » et « Présentez ce QR code lors de votre rendez-vous. », sans mention supplémentaire « Conservez ce QR code… ». Le code de retrait reste disponible, plus discret, en bas. Cette présentation ne modifie ni l’attribution, ni le consentement, ni l’envoi de l’e-mail.

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

- Supervision (#491) affiche des observations, pas un certificat de santé production : dernier webhook daté, dernier traitement planifié observé, source indisponible explicite, aucun zéro fabriqué. Les files d’attente actuelles sont limitées à l’établissement choisi mais indépendantes des filtres de période/recherche. Les quatre historiques ont des filtres serveur, un total exact et des pages de 25 lignes indépendantes. Les jours du filtre sont explicitement UTC (fin incluse), les horodatages affichés en heure de France. Les gains non retirés sont un suivi commercial, jamais une panne. Les e-mails de gain et les notifications établissement sont distingués ; acceptation Resend, livraison, reprise et intervention ne sont pas confondues. Aucun renvoi ou changement de préférence depuis cette consultation. Le journal n’est pas exhaustif et les webhooks archivés ne constituent pas tous les envois du fournisseur.

- Supervision présente les e-mails, webhooks, gains sans retrait et journal dans quatre tableaux pleine largeur superposés (issue #489). Recherche, filtres, informations et traitement des incidents sont conservés. Sur mobile, chaque tableau peut défiler horizontalement, sans élargir la page. Aucun changement aux envois, gains, droits ou données fournisseur.

- Supervision distingue les incidents d’e-mail **à traiter** et **traités** (issue #487). L’administrateur peut « Marquer comme traité » un échec, rebond, plainte ou suppression historique. L’action enregistre la date et l’identité de l’administrateur et retire l’incident des alertes actives de Supervision, Pilotage et de la navigation ; le filtre « Traités » permet de retrouver les derniers incidents acquittés. Le statut réel de l’envoi, l’erreur et les événements fournisseur sont conservés. Aucun renvoi ni changement de programmation des reprises n’est déclenché. Un nouvel événement ou un changement de statut invalide l’acquittement précédent ; une page devenue obsolète ne peut pas acquitter ce nouvel incident. Le compteur global des e-mails actifs n’est pas limité aux 20 incidents affichés.

- Pilotage propose « Voir la fiche » pour chaque compte (issue #475). Cette popin en lecture seule présente l’identité, le logo, les coordonnées, les liens marketing, la fiche Google enregistrée et les paramètres non secrets de l’établissement. Les comptes multi-sites disposent d’un sélecteur parmi leurs sites actifs accessibles. Les champs absents sont indiqués sans inventer d’URL ; seuls les liens HTTP(S) valides sans identifiants intégrés s’ouvrent dans un nouvel onglet. Le chargement intervient à l’ouverture, avec état de chargement, erreur et reprise. Aucune modification, aucun changement de site actif ni de données de jeu ; PIN et secrets techniques restent masqués.

- Pilotage propose « Voir les jeux » pour chaque compte et une liste globale « Jeux des marchands », paginée et recherchable par nom de jeu (issue #467). L’administration peut reprendre le Wizard, l’affiche, le logo de l’affiche et la prévisualisation isolée de tout jeu existant, sans devoir en être le créateur ni se connecter en tant que marchand. Le contexte réel de l’établissement est chargé côté serveur ; les personnalisations et données existantes sont conservées. Les permissions du marchand, les profils et les abonnements ne sont pas élargis.
- Dans ses Campagnes, l’administration dispose de « Dupliquer vers un marchand » (issue #469), sur le modèle de « Dupliquer vers des sites » : rechercher le compte, sélectionner jusqu’à 20 établissements, puis créer des brouillons indépendants. L’option visible « Utiliser le logo et les liens du destinataire », cochée initialement, adapte l’identité du jeu et de l’affiche, les URL des actions présentes et l’expéditeur/adresse de réponse de l’e-mail ; les actions sans URL renseignée sont retirées, aucune nouvelle action n’est ajoutée. La décocher conserve ces informations du modèle. Design, textes personnalisés, type de jeu, lots/conditions/probabilités et règles sont conservés. Les textes personnalisés contenant un nom ou lien saisi en dur restent à vérifier avant publication. Les copies réussies et leurs liens de modification restent affichés même après un échec partiel ; les établissements déjà copiés ne sont pas sélectionnables à nouveau dans ce dialogue.

- L’e-mail de gain recommandé (Issue #454) présente, dans cet ordre, « Félicitations [prénom] 🎁 », le lot et l’établissement, les instructions de présentation du QR code à la prochaine visite, les conditions effectivement configurées et la période réelle de validité, puis le QR code de retrait et le code de secours accompagné d’une explication en cas de difficulté de scan. L’usage unique est rappelé. Les anciens textes standards sont mis à niveau au rendu sans migration ; les textes personnalisés sont conservés. Les aperçus marchand utilisent le même HTML que l’envoi. Le lien de rendez-vous reste conditionnel et ni l’envoi ni les règles de retrait ne sont modifiés.
  - Les données du gain ne sont pas des exemples figés : prénom, établissement, lot, conditions, dates, QR et code de secours viennent du gain concerné. Le logo configuré pour la campagne reste en en-tête ; en son absence, le nom de l’établissement est affiché. Dans le modèle recommandé, l’instruction est « Présentez ce QR code lors de votre prochaine visite. ». « Code de secours : [code] » apparaît sur une ligne en gras, puis « En cas de problème avec le QR code, présentez ce code à l’établissement. » (retours PR #455).

- Les pages marketing Accueil, Restaurants et Instituts de beauté partagent le logo étoile Okado et une FAQ expliquant que les actions Instagram/Google sont configurées par les liens de l'établissement, sans connexion de ces comptes à Okado ni demande de mot de passe ou d'autorisation d'accès (Issue #452). Cette information ne concerne pas la connexion optionnelle à l'espace marchand avec Google.
- Lors de l’initialisation d’un nouveau ticket à gratter, le template par défaut est **Nude Élégance** pour le secteur Beauté, et **Nude** pour les autres secteurs (y compris un secteur non renseigné). Un template déjà enregistré ou un choix déjà effectué n’est pas remplacé (Issue #441 / PR #442).
- Lors de la création d’une campagne du secteur **Beauté**, l’affiche est initialisée avec le preset **Élégance** (fond ivoire, typographie et palette propres au template). Les autres secteurs conservent **Classique**. Ce défaut commun au Wizard, à l’éditeur classique et à l’assistance administrative ne remplace pas le template d’une campagne déjà enregistrée ; aucune migration des affiches existantes n’est effectuée (issue #597).
- Une animation créée et pilotée par un marchand est un **jeu**. La rubrique de navigation qui regroupe ces jeux s’intitule **Campagnes** ; *campagne* reste aussi le terme technique/historique du modèle de données.
- Les actions marketing sont proposées **avant** le jeu et sont séquencées par visite.
- L’option « Exiger le clic sur Écrire un avis avant de jouer » (#638), désactivée par défaut, concerne uniquement l’action Google proposée à cette visite. Le marchand confirme « Je comprends et j’accepte » dans l’avertissement avant activation ; une nouvelle activation exige une nouvelle acceptation. Le clic débloque le jeu, sans obligation ni contrôle de publication d’un avis. Les copies de jeux repartent avec cette option désactivée.
- Retour propriétaire du 18 octobre 2026 (#564) : l'étape s'intitule « Les actions », sans « Facultatif ». Cela ne rend pas les actions obligatoires : l'avertissement avant publication sans action est conservé. Mon compte → Liens marketing reprend les cartes et icônes de la bibliothèque, avec les mêmes marques et pictogrammes génériques, sans modifier les liens enregistrés ni proposer la réservation comme action de jeu.
- La bibliothèque de l'étape Actions du Wizard (#564) distingue les destinations configurées dans Mon compte pour l'établissement, les actions déjà ajoutées et les liens à configurer. Elle propose Google, Instagram, Facebook, TikTok, Tripadvisor, site web et lien personnalisé. Réservation n'est pas proposée ni ajoutée aux valeurs initiales ; les anciennes actions et le lien de rendez-vous de Mon compte sont conservés. Plusieurs liens personnalisés peuvent être ajoutés au même jeu (limite existante : 12 actions) ; cette entrée ne devient pas « Déjà ajoutée ». Les cartes conservent l'ordre des visites ; elles sont modifiables, supprimables avec annulation et réordonnables au clavier ou par glisser-déposer.
- Configurer une destination absente met à jour uniquement le champ correspondant de l'établissement. Modifier une action existante ne change que ce jeu. La publication sans action est possible après avertissement et confirmation ; un brouillon reste enregistrable sans avertissement.
- Lorsqu'un lien personnalisé valide existe dans Mon compte, l'ajout d'un autre lien personnalisé concerne uniquement le jeu et n'écrase pas ce lien réutilisable. En son absence, le premier lien est enregistré dans Mon compte après indication explicite dans la popin.
- La collecte d'e-mail est une option indépendante des actions marketing.
- Le Wizard masque le sélecteur Objectif (#553) et initialise les nouveaux jeux sur « Obtenir des avis » (`review_prompt`). Les actions restent modifiables à leur étape ; aucune action Google sans URL renseignée n'est créée. En édition, l'objectif enregistré, les actions et la collecte e-mail existants sont conservés : le masquage n'est pas une migration.
- Un brouillon peut être sauvegardé incomplet ; la publication est bloquée tant que les éléments requis sont invalides.
- La prévisualisation est isolée : elle ne décrémente pas les lots et ne nourrit pas les indicateurs de production.
- Seul l'administrateur de la plateforme accède aux fonctionnalités qui lui sont dédiées. Les utilisateurs marchands pilotent leurs propres établissements et jeux.
- Le personnel du commerce n'a pas de compte dédié à la plateforme : il valide un retrait depuis le QR code du client avec le PIN marchand.
- Le formulaire classique ne peut être supprimé qu'après reprise fonctionnelle suffisante dans le wizard et validation des parcours de bout en bout, à la fois par le propriétaire et par les tests automatisés.
- Le secteur d'activité d'un établissement n'est pas prérempli pour un nouveau profil et peut rester vide ; les choix déjà enregistrés pour les établissements existants sont préservés.
- Le secteur Beauté propose six sous-secteurs : Beauté généraliste / multi-activité, Coiffure, Ongles, Regard — cils & sourcils, Massage & Spa et Soins visage & corps. Les anciennes valeurs ne sont conservées que si référencées. Les suggestions sont ciblées par sous-secteur ; sans bibliothèque dédiée, la bibliothèque généraliste reste disponible en repli.
- Les établissements du secteur Beauté disposent de six styles de roue supplémentaires, quel que soit leur sous-secteur. Cette collection apparaît avant les modèles génériques dans les éditeurs ; les joueurs voient le modèle enregistré sans restriction de secteur. Le logo, le titre, le sous-titre, les couleurs et la police restent personnalisables. Les centres JOUER des six thèmes `beauty-*` sont sans icône, avec une police agrandie et un reflet discret en haut à gauche (issue #460). Éclat conserve son bouton, son pointeur et son anneau blanc antérieurs à la PR #461. L'interaction du bouton reste identique.

## Choix des polices Beauté — #551

Les six roues Beauté proposent Playfair Display, Cormorant Garamond et Bodoni Moda
en complément de leurs choix existants, dans le Wizard et l'éditeur classique.
Éclat et les tickets Beauté conservent ces trois polices déjà disponibles. Les polices
initiales de chaque modèle, les choix enregistrés et les autres personnalisations
ne sont pas modifiés. Les libellés des segments et JOUER gardent leur police de
lisibilité dédiée ; les affiches et exports sont hors périmètre.

## Fonds Rose poudré et remplacement Noir & Or — issues #462 / #463

Rose poudré utilise par défaut une image raster de satin rosé et de pétales sur les bords ; ses couleurs, segments, centre et textes ne changent pas. Noir & Or remplace le nom et l’habillage d’Éditorial chic, tout en conservant l’identifiant `beauty-editorial` : fond du ticket Noir & Or Signature, titre champagne, logo/sous-titre ivoire, roue noire/ivoire/or et contours dorés. Les nouveaux choix sont centrés ; les alignements déjà mémorisés restent prioritaires. Les miniatures reprennent ces fonds et palettes.

Les images natives sont résolues à l’affichage, jamais enregistrées comme un choix marchand. Une image manuelle ou une couleur de fond explicitement enregistrée différente du nouveau défaut reste prioritaire. Ainsi une ancienne campagne Éditorial chic avec fond ivoire enregistré n’est pas convertie silencieusement en fond sombre, ce qui préserve la lisibilité de ses textes sombres ; sélectionner le nouvel habillage sur une campagne sans réglages mémorisés propose Noir & Or. Aucun changement du moteur de jeu, des lots, des probabilités ou des tickets à gratter.

## Finitions des roues Beauté — issue #460

Les six thèmes `beauty-*` partagent une finition de disque central en relief, sans icône, avec JOUER en DM Sans. Après le retour propriétaire sur la PR #461, JOUER est réduit de 1 px (16–27 px), le filet blanc intérieur du bouton est supprimé et remplacé par un contour assombri et une ombre douce. Les libellés des lots utilisent également DM Sans, graisse 600, sans modifier leur orientation relative aux segments ni leur taille minimale. Le contour coloré est renforcé de 1 px et suivi d'un liseré blanc extérieur de 2 px, sans anneau coloré extérieur en doublon. Les pointeurs gardent leur ancrage et bénéficient d'un dégradé/reflet et d'une ombre douce. Un filet fin suit le logo uniquement en mode texte ; il est absent en mode image et sans logo. Les diamètres des centres, palettes, réglages de textes/espacements, fonds et mécanique de jeu sont préservés. Les miniatures reprennent les mêmes finitions. À la demande du propriétaire, Éclat (`rose-institut`) est exclu des nouvelles finitions du bouton, du pointeur et de l'anneau : fond central uni, bord blanc de 3 px, libellé de poids 700 dans la police héritée, pointeur facetté blanc/rose et anneau blanc SVG de 18 unités restaurés depuis la base `b83ab067`. Son filet de logo texte et la police lisible des lots restent conservés.

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

## Suggestions de lots Beauté — issue #466

Les établissements disposent de six bibliothèques adaptées : généraliste (7 suggestions), Coiffure (10), Ongles (12), Regard — cils & sourcils (11), Massage & Spa (10), Soins visage & corps (11). Les 61 valeurs de référence sont celles des tableaux de l'issue #466. Le wizard et l'éditeur classique copient libellé, probabilité, coût et condition uniquement lorsque le marchand ajoute une suggestion ; l'achat requis est précoché si la condition le prévoit. Tout reste ajustable.

Les choix sont disponibles dans le profil, l'onboarding et la gestion administrative du catalogue. Un établissement sans spécialité ou conservant une ancienne catégorie ambiguë reçoit le catalogue généraliste, avec ses éventuelles suggestions personnalisées générales/historiques. Une bibliothèque spécialisée vide conserve le repli général existant. Le changement de contexte annule les chargements périmés.

Les anciennes catégories ambiguës ne sont pas proposées à un nouveau profil ; une valeur déjà enregistrée reste sélectionnable pour ce profil. La migration ne remplace que les sept suggestions du catalogue standard restées strictement identiques à leur référence. Les personnalisations, les autres secteurs et les lots des jeux ne sont pas modifiés. [Migration, retour arrière et recette](releases/beauty-catalog-466.md).

## Site public — audit #506

Le site public décrit Okado comme un logiciel de jeux par QR code pour commerces : roue, ticket à gratter, affiches et suivi des gains/retraits. Les pages métiers, fonctionnement, tarifs et guides partagent la marque étoile violette, la navigation et les mêmes définitions produit. Les exemples chiffrés et la démo simplifiée sont explicitement fictifs ; un clic Google ne prouve pas un avis publié, et ni le dépôt ni la note d'un avis ne conditionnent le jeu ou le gain. Collecte avant jeu et coordonnées du gagnant sont deux parcours, distincts du consentement marketing facultatif.

L'inscription par formulaire demande uniquement l'acceptation des CGV dans une case non précochée ; cette case ne recueille aucun accord commercial. La présente évolution ne crée pas une preuve serveur d'acceptation ni une préférence marketing, et ne change pas la connexion Google ou la synchronisation Brevo existante. Les décisions restantes sur les traceurs, contrats, preuves et conservation sont suivies dans #507–#509. [Périmètre, recette et retour arrière](releases/2026-10-14-site-seo-506.md).

## Cohérence des templates de jeu — issue #511

- Le fond par défaut de **Bicolore** suit la couleur principale de la roue, et non la couleur secondaire jaune. Un ancien fond standard est résolu à l'affichage ; une image manuelle ou une couleur de fond personnalisée distincte reste prioritaire. Les changements de couleur principale suivent le fond standard dans les deux éditeurs.
- **Dynamique** et **Signature** conservent les retours à la ligne explicites de la promesse, sans appliquer le découpage automatique des autres roues. Le rendu est commun au jeu et à ses prévisualisations.
- Les tickets à gratter n'affichent plus de phrase d'aide sous la zone à gratter, y compris « Le résultat s'affiche automatiquement. ». Le titre, le sous-titre personnalisable, les espacements avant la zone, le geste de grattage et le résultat restent inchangés.
- Toutes les surfaces de grattage sont contenues à 70 % de la largeur (maximum 216 px) et centrées dans l'espace disponible sous le titre et la consigne. L'espacement configuré reste une distance minimale avant la zone. Le geste, le résultat et les dimensions sauvegardées de la campagne ne changent pas.
- **Cadeau lilas** utilise son encre prune foncée `#210b32` pour le logo et les textes par défaut. Le bleu historique hérité `#003cb4` est traité comme un ancien défaut, au même titre que les anciennes encres du modèle. Les autres couleurs personnalisées et les styles propres mémorisés sont conservés. La correction porte sur la lecture/sélection et le rendu ; aucune réécriture de campagne en base.

## Mesure d'usage — #508

Consentement de mesure (#508, accord propriétaire du 15 octobre 2026) : le site
public et l'application présentent Accepter / Refuser et un accès permanent
Gérer les cookies. Le choix porte sur la mesure PostHog et Vercel Analytics,
distincte de la prospection du marchand et de l'acceptation des CGV. La collecte
produit, y compris côté serveur, attend un accord valide. Le refus laisse les
parcours métier disponibles. Les textes de confidentialité et le DPA sont
complétés pour revue ; les preuves fournisseurs et décisions de conservation
par finalité sont recensées dans [le dossier données](DATA_PROCESSING_REGISTER.md).

## Démonstration du site marketing — #514

Finalisation de la mesure autorisée le 16 octobre 2026 (#507) : compter le
démarrage au clic Jouer, conserver les événements de conversion aux changements
de sous-domaine et permettre une lecture par page/UTM autorisés, sous le choix
de mesure existant. Aucun compte, gain ou e-mail réel n'est créé pour tester.
Les définitions, dénominateurs, fenêtres et limites sont dans
[le plan de tracking](ANALYTICS_TRACKING.md#exploitation-et-fiabilisation--507-16-octobre-2026).

La démo partagée par l'accueil, Restaurants et Instituts de beauté distingue le
parcours client des résultats du commerce. La roue complète, la progression et
les résultats fictifs restent lisibles sur mobile. Les écrans d'action, de gain
et de confirmation restent des simulations locales : avis facultatif, champs
facultatifs, aucun lot réel, aucune coordonnée transmise et aucun e-mail envoyé.
Les exemples chiffrés ne promettent pas de résultats. Le suivi d'audience reste
soumis au choix existant, sans nouveau traitement.

### Parcours de démonstration approuvé le 16 octobre 2026 — #516

Les enseignes fictives ont une identité typographique distincte de l'étoile
Okado. La roue de démonstration a huit secteurs (quatre lots/quatre pertes) et
un gain déterminé pour montrer la suite, sans représenter une probabilité réelle.
L'invitation Google peut être ignorée ; son écran simulé propose de une à cinq
étoiles sans présélection. Aucune note, y compris l'absence de note, n'influence
le jeu ou le gain ; rien n'est publié, envoyé ni persisté depuis cet écran.

Simplification validée ensuite par le propriétaire le même jour : montrer le
parcours plutôt qu'en expliquer chaque étape. Les noms « Le bistro » et
« L’atelier beauté » sont conservés. L'invitation reprend « Avant de jouer »,
« Écrire un avis » et « Jouer maintenant » du jeu réel. L'écran Google se limite
au titre, aux cinq étoiles et au retour au jeu ; il ne reproduit pas toute
l'interface externe. Les explications contextuelles côté commerce sont retirées.

Le formulaire local reste facultatif ; son titre, son information sur l'envoi
du gain, ses placeholders et « Recevoir mon gain » reprennent le SaaS.
La confirmation reprend « Votre gain est confirmé ! » et le texte réel
e-mail/spams, avec un QR illustratif et l'instruction de présentation.
Un aperçu facultatif utilise exclusivement une identité et une adresse fictives.
Un seul avertissement, hors du téléphone, précise l'absence de lot, d'avis publié,
d'envoi et de transmission des saisies ; les écrans ne répètent plus ces mentions.
Les QR n'encodent aucune capacité de retrait. Aucun indicateur fictif n'est
incrémenté. Les jeux, avis, tirages, consentements et e-mails réels du SaaS ne
sont pas modifiés. La démo n'est pas une reproduction exhaustive des formulaires,
conditions ou téléchargements du jeu réel.

## Preuves produit sur le site public — #520

L'accueil reste généraliste. Ses liens de premier niveau présentent les lots
adaptés au métier, le retrait validé et le suivi par e-mail. La page Beauté
montre trois compositions illustratives Regard, Ongles et Spa avec identité,
jeu mobile, affiche, lot et condition explicite. Elles utilisent les fonds
existants ; ce ne sont ni des jeux actifs ni des captures exhaustives du SaaS.
Les cinq fonds restent consultables dans la page Ticket à gratter.

La démonstration conserve ses étapes Google/jeu/formulaire/confirmation/e-mail
et ses événements de mesure existants. Retour propriétaire du 17 octobre (#536) :
la simulation de validation du retrait côté commerce et son bouton sont retirés
de la démo. Le parcours s'arrête à la confirmation et à l'aperçu e-mail ;
les indicateurs illustratifs et synthèses restent visibles séparément.
Le téléphone, la roue ivoire/dorée (restaurant) ou rose (Beauté), le pointeur et
les panneaux partagent une présentation plus soignée. Le bouton Jouer n'a pas
d'icône. Aucun appel métier, PIN, stockage ou compteur modifié ; le retrait
sécurisé réel dans le SaaS reste inchangé.

L'accueil et la page Beauté montrent une synthèse marchand fictive : détail des
gains, expiration ou statut Récupéré, retraits sur la période pouvant concerner
un gain antérieur, stocks disponibles/illimités/épuisés. La relance au gagnant
est présentée séparément, comme une option désactivée par défaut au niveau du
compte avec délai personnalisable et règles d'éligibilité existantes. Les
aperçus sont éditoriaux, pas de nouveaux modèles transactionnels. Aucun e-mail
n'est envoyé. Aucune hausse de CA, témoignage client ou exclusivité concurrentielle
n'est inventée ; un cas pilote exige des chiffres vérifiés et une autorisation
de publication distincte. [Périmètre et recette](releases/2026-10-16-marketing-proof-520.md).

## Questions ouvertes

- [ ] Définir les critères de retrait forcé à afficher et à journaliser pour le personnel du commerce.
- [ ] Définir précisément le seuil de parité fonctionnelle du wizard qui déclenchera le retrait du formulaire classique.
- [ ] Valider les règles de conformité restantes dans `docs/DOMAIN_RULES.md` (consentement, conservation des données et preuves associées).
