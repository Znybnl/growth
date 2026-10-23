# Règles métier — Okado

## Représentation des lots sur la roue — #628

Chaque lot éligible (libellé renseigné, probabilité positive) doit être représenté
au moins une fois, ainsi que la perte lorsqu'elle existe. La cible visuelle de
secteurs ne doit jamais masquer un lot distinct : réduire les répétitions, puis
augmenter le nombre de secteurs si nécessaire. Le résultat exact du tirage reste
présent pour l'animation. Cette présentation ne modifie ni chances réelles,
stocks, tirages ou résultats enregistrés. Décision propriétaire du 23 octobre 2026.

Ce document regroupe les invariants fonctionnels approuvés d'Okado. Il ne remplace pas un avis juridique. Toute évolution du consentement, des données personnelles, des avis Google ou des règles de retrait doit être validée par le propriétaire avant implémentation.

## Consultation administrative des établissements — #475

La fiche dans Pilotage est réservée à l’administration de la plateforme et consultable uniquement en lecture seule. Chaque site présenté est résolu via les associations existantes du compte, sans modifier le site actif de la session. La réponse serveur utilise une liste explicite de champs : coordonnées, identité, liens marketing et paramètres non secrets. Aucun PIN, empreinte/chiffrement de PIN, jeton, mot de passe ou identifiant privé Stripe n’est transmis. Le navigateur ne mémorise pas ces profils dans un stockage persistant et la réponse HTTP est privée et non mise en cache.

## Autorité et périmètre

- Pierre-Henri BRUNELLE est l'administrateur de la plateforme et l'unique valideur des PR, merges et déploiements en production.
- Chaque marchand est responsable de traitement des données de ses contacts : il décide de l'usage des contacts, du respect du règlement de son jeu et de la remise des lots à ses clients.
- Okado agit comme sous-traitant technique pour les traitements réalisés au moyen de la plateforme, conformément aux instructions documentées du marchand et au contrat applicable.
- Un marchand ne consulte et ne pilote que ses établissements, ses jeux, ses résultats et ses paramètres autorisés.
- Le personnel du commerce ne possède pas de compte Okado dédié. Il peut ouvrir la page de retrait avec le QR code présenté par le joueur et confirme la remise avec le PIN marchand.
- Un joueur ne peut pas accéder à l'espace marchand depuis les parcours publics de jeu ou de retrait.
- Depuis Pilotage, l’administrateur plateforme peut consulter et modifier les jeux existants des marchands et leur affiche, indépendamment de leur créateur (issue #467). Chaque accès est vérifié côté serveur ; une sauvegarde vérifie également le rattachement jeu/établissement/compte. Cette assistance ne change ni la session, ni le propriétaire du jeu, ni la fiche établissement. La publication reste explicite et suit les validations habituelles. Les sauvegardes administratives sont journalisées ; l’audit de création existant est préservé.
- L’administrateur plateforme peut dupliquer un jeu de son établissement actif vers des établissements d’un compte marchand choisi (issue #469). La duplication crée des brouillons indépendants, avec leurs propres identifiants/QR, les stocks initiaux et aucun historique, contact ou gain copié. Le serveur vérifie la propriété de la source et tous les établissements cibles avant création. La confirmation propose explicitement d’adapter logo, liens marketing et expéditeur/adresse de réponse au destinataire ; si cette option est désactivée, les informations du modèle sont conservées et doivent être revues avant publication. Les médias importés sont copiés dans le stockage cible pour ne pas dépendre du nettoyage de la source. La fiche établissement, la session, les souscriptions et la source ne sont pas modifiées ; les créations sont journalisées.

## Cycle de vie d'un jeu

- L’administration peut télécharger le QR de diffusion d’un jeu marchand depuis Pilotage et l’éditeur dédié (issue #470), après vérification serveur de son rôle et du contexte du jeu. Le téléchargement ne publie pas un brouillon, n’ajoute pas de jeton de prévisualisation et ne modifie pas les indicateurs du marchand. Un QR de brouillon est identifié comme à diffuser après publication.

- Un jeu peut être enregistré en **brouillon**, même incomplet.
- La publication d'un jeu est bloquée tant que les données obligatoires ou les règles de dotation ne sont pas valides.
- Un brouillon reste prévisualisable, mais son QR code de diffusion ne doit pas être présenté comme un QR code public actif.
- Le mot **jeu** est utilisé dans l'interface ; **campagne** est réservé aux usages techniques ou historiques.

## Dotations et probabilités

- Compositions sectorielles — #623, décision propriétaire du 23 octobre 2026 :
  les nouveaux jeux démarrent sans lot fixe. Le marchand choisit explicitement
  une recette du catalogue actif, avec Équilibré recommandé, ou crée ses lots.
  Les recettes sont définies par secteur/sous-secteur et type de restauration,
  non par classement automatique des coûts. Profils proposés :
  Budget maîtrisé25/15 (40% gagnant), Équilibré35/25/10 (70%),
  Généreux50/30/20 (100%). Chaque profil contient une seule remise en pourcentage.
  Une suggestion manquante/inactive ne peut pas être inventée ou remplacée
  silencieusement ; seules les recettes complètes sont proposées. Les conditions
  des nouvelles suggestions standard hors Beauté sont copiées et l'achat requis
  est prérempli si leur condition l'impose. Les copies restent modifiables.
  Aucun lot/stock/coût/condition de jeu existant ni suggestion personnalisée
  n'est modifié. Catalogue et matrice : [release #623](releases/2026-10-23-sector-prize-compositions-623.md).

- Budget théorique — #609 phase 5, SFD §7 : moyenne par participation = Σ(probabilité / 100 × coût unitaire), projection pour 100 = moyenne ×100, sans coût de la part perdante ni plafonnement par stock. Estimation indicative supposant tous les gains attribués utilisés, jamais une promesse de dépense réelle. Si un lot de chance positive a un coût inconnu, ne pas afficher de total complet ; indiquer le nombre de coûts manquants et permettre leur saisie. Un zéro explicitement saisi est connu. Les anciennes valeurs numériques, y compris zéro, ne sont pas réinterprétées ; le marqueur facultatif `estimatedUnitCostKnown:false` des réglages du lot conserve les nouveaux coûts non renseignés à la sauvegarde et à la copie. Aucun calcul historique ni moteur de tirage n’est modifié.
- Les limites existantes des règles sont contrôlées explicitement avant sauvegarde : validité0–365jours, intervalle1–365jours, disponibilité0–8760heures, valeurs entières. Les dates et le sens des valeurs stockées ne sont pas recalculés par cette refonte. Le total>100% est refusé par l’API aussi en brouillon, conformément à la décision locale de l’atelier ; le brouillon incomplet à0% reste permis.

- Compositions — #609, phase 4, SFD §12 : propositions indicatives issues du catalogue actif déjà filtré pour l’activité, pas d’un catalogue parallèle. Elles ne remplacent que les lots du brouillon après choix explicite ; une composition non vide exige confirmation, annuler conserve ses données. Les nouveaux lots sont indépendants, modifiables et à stock illimité comme les suggestions, sans reprise de stock historique. Les règles globales et les anciens jeux ne changent pas ; PERDU reste une part calculée. Les validations habituelles de sauvegarde/publication continuent de s’appliquer.

- Atelier de composition — #609, décision propriétaire du 20 octobre 2026 : les probabilités sont modifiables directement dans la liste. Une somme provisoire supérieure à 100 % est autorisée dans l’éditeur local ; l’enregistrement d’un lot dans cette composition reste possible avec une alerte immédiate, unique et non bloquante. L’enregistrement du jeu, sa publication et le passage à l’étape suivante restent bloqués tant que la somme dépasse 100 %. Chaque probabilité individuelle reste comprise entre 0 et 100 %.
- La part « PERDU » est calculée par `max(0, 100 − somme des probabilités des lots gagnants)` et reste informative : aucun lot perdant, stock ou coût associé n’est créé en base. Les paramètres existants de disponibilité, validité et délai de participation sont regroupés après les lots sans changement de leurs valeurs ni des calculs métier.
- Bibliothèque du wizard — #609, phase 2 : les suggestions reprennent le catalogue existant du secteur/sous-secteur. Les ajouts rapides empêchent les doublons accidentels et créent des copies modifiables dans le brouillon. Si la chance suggérée dépasse la part disponible, le marchand choisit explicitement une valeur ou annule ; aucune probabilité des autres lots n’est modifiée automatiquement. Les dépassements provisoires suivent la règle locale de l’atelier de composition ci-dessus.
- Réutilisation — #609, phase 3 (SFD §11, lancement validé le 21 octobre) : « Mes lots » ne lit que les lots des autres jeux du même établissement, jamais ceux d'un autre site du compte. La copie possède un nouvel identifiant et conserve libellé, chance, coût, conditions et achat requis sans lien dynamique vers l'original. Le stock restant de l'ancien jeu n'est jamais lu ni repris ; le stock initial limité proposé doit être confirmé ou modifié, avec possibilité de choisir Illimité. Les doublons de configuration identique sont regroupés en conservant l'occurrence la plus récente ; des conditions, stocks, coûts, chances ou exigences d'achat différents restent distincts.
- Le catalogue de suggestions est indépendant des lots déjà enregistrés dans les jeux. Sa refonte ne modifie aucun lot, gain, stock, coût, condition ou probabilité existant (issue #466, décision propriétaire du 6 octobre 2026).
- Les six sous-secteurs Beauté sont : Beauté généraliste / multi-activité, Coiffure, Ongles, Regard — cils & sourcils, Massage & Spa, Soins visage & corps. Les anciennes catégories ambiguës ne sont conservées que si un établissement ou une suggestion les utilise ; aucune reclassification automatique. Les suggestions personnalisées restent intactes.
- Les probabilités de bibliothèque sont des valeurs individuelles proposées, pas une distribution à normaliser. Seuls les lots choisis entrent dans le calcul du jeu.
- À l'ajout d'une suggestion Beauté, sa condition suggérée préremplit les conditions d'utilisation. « Achat requis pour le retrait » est activé lorsque cette condition impose une prestation payante ou une nouvelle pose ; une réduction à tarif normal ou un cadeau autonome ne l'active pas. Ces réglages restent modifiables, sans recalcul rétroactif sur les lots existants.

- Un lot publiable doit avoir un libellé, une quantité disponible strictement positive et des conditions de retrait cohérentes.
- SFD Lots #609, §6.3 : la publication exige au moins un lot avec une probabilité de gain strictement positive. Une composition à 0 % peut rester un brouillon incomplet ; elle ne peut pas être publiée.
- Lorsque « Jeu 100 % gagnant » est activé, la somme des probabilités des lots doit être exactement égale à 100 % au moment de la publication.
- Décision propriétaire du 23 octobre 2026 — #629 : cocher « Jeu 100 % gagnant » ne modifie pas les chances saisies. Lors du tirage réel dans ce mode, seuls les lots à probabilité strictement positive et stock disponible (ou illimité) sont éligibles. Leur probabilité effective est `probabilité configurée / somme des probabilités éligibles`, sans plancher à 1 %, sans modifier les valeurs en base. Un lot à 0 % ne gagne jamais. Si aucun lot n'est éligible, refuser la nouvelle partie sans créer de session, participation ou gain. Ce mode ne produit pas de perte. Le comportement de prévisualisation, qui peut forcer un gain, est conservé ; le tirage normal ne change pas. Les segments visuels ne participent jamais au tirage.
- La modification opérationnelle du stock concerne le **stock disponible** ; le stock initial reste la référence de création.
- Les anomalies de dotation doivent être affichées dans la section concernée avant la publication.

## Parcours joueur et actions marketing

### Cohérence des indicateurs — #498

Décision propriétaire du 13 octobre 2026 : traiter les recommandations de #498.
Un même indicateur utilise la même source et la même formule à périmètre égal.

- « Clics sur les actions marketing » compte les événements réels Google, sociaux et liens personnalisés, indépendamment du formulaire. Ce n'est pas une preuve d'avis publié ou de suivi. Le total et les volumes par action reposent sur ces clics ; les anciens clics sans identifiant stable restent non attribués. Une reprise technique d'un même événement n'ajoute pas de clic ; deux clics volontaires distincts sont deux événements.
- La conversion globale est le ratio des totaux de participations/scans, arrondi une fois, jamais une moyenne des taux par jeu. Pas de bornage artificiel à 100 % ; zéro si aucun scan.
- Les opt-ins sont les enregistrements ayant un consentement marketing, pas des personnes uniques. Un échec de lecture n'est pas un zéro réel.
- « Gains à suivre » / « À retirer » : lot associé, statut claimed, expiration absente ou non passée. Une disponibilité future reste à suivre ; ce compteur ne promet pas que le retrait est déjà possible. Les pertes, lignes sans lot, gains retirés/expirés sont exclus. Les incidents techniques de Supervision gardent leur propre périmètre.
- La date de retrait effective vient de redeemed_at. Pour l'historique où elle manque, seule la dernière preuve de retrait postérieure à la création du gain et à sa dernière réinitialisation est utilisable, jamais une date estimée. Les cas non datables restent dans le total mais sont signalés/exclus des répartitions par période. Une réinitialisation annule le retrait courant ; le prochain retrait possède sa nouvelle date.
- Les graphiques couvrent des jours calendaires UTC complets ; les synthèses gardent leurs périodes locales closes et leur contenu figé. Aucun e-mail historique n'est rejoué.
- Stock faible : stock fini et initial positif, restant strictement positif et au plus max(1, ceil(initial × 20 %)). Stock nul = épuisé, catégorie distincte ; illimité = aucune alerte de seuil. Les alertes opérationnelles portent sur les jeux actifs. Ces états n'interviennent jamais dans la consommation ou les participations.
- Pilotage compte les établissements ayant un abonnement actif ou un essai valide, cohérent avec l'état présenté dans les lignes. Un essai applicatif n'exige pas Stripe. L'unité établissement est explicite, sans modification de droits ou facturation.
- Les totaux ne dépendent pas d'une page REST ni des filtres de recherche/pagination des contacts. L'interface distingue contacts collectés, participations, gains et personnes uniques.

- Décision propriétaire du 13 octobre 2026 (#496) : une **participation** est une partie effectivement commencée, distincte du scan et du contact. Elle est comptée une fois par session, que le joueur gagne ou perde, fournisse ou non ses coordonnées. Pour la roue, le tirage préparé au clic Jouer démarre immédiatement ; pour le ticket, seule la première action de grattage compte, pas sa préparation. Le formulaire et ses reprises n'ajoutent pas de partie. Les prévisualisations sont exclues.
- Les KPI Participations, courbes et sélecteurs utilisent ce même comptage. Conversion = participations / scans ; coût par participation = coût estimé des gains / participations (0 sans partie). Contacts, opt-ins, gagnants, retraits et coût par contact restent séparés. Les listes/exports de contacts n'inventent aucune coordonnée pour les parties anonymes.
- L'historique utilise les événements de jeu persistés et les contacts effectivement finalisés, rattachés à la même session lorsque ce lien existe. Une session simplement préparée ne constitue pas une preuve historique de grattage. Les parties anciennes non tracées ne sont pas reconstituées par estimation.

- Les actions marketing sont proposées avant la participation au jeu.
- Les actions sont séquencées par visite : action 1 pour la première visite, action 2 pour la deuxième, puis ainsi de suite.
- Décision propriétaire du 17 octobre 2026 (#564) : les liens réutilisables appartiennent à chaque établissement et correspondent aux champs de **Mon compte**. Configurer une destination absente depuis la bibliothèque du Wizard enregistre uniquement ce lien, puis ajoute l'action au jeu. Une modification d'action existante concerne ce jeu uniquement ; les autres jeux ne sont pas réécrits.
- Précision propriétaire #564 : Réservation est retirée des actions proposées et des valeurs initiales du Wizard administrateur, le joueur étant déjà sur place. Les liens de rendez-vous du profil et les actions des jeux existants ne sont pas supprimés. L'ajout de liens personnalisés reste possible lorsqu'une action personnalisée existe déjà, dans la limite de 12 actions ; un lien supplémentaire n'écrase pas le lien personnalisé valide de Mon compte.
- Un jeu sans action marketing est autorisé. Le Wizard et l'éditeur classique demandent une confirmation explicite avant l'enregistrement d'un jeu actif sans action ; annuler n'enregistre ni ne publie. L'enregistrement d'un brouillon sans action ne demande pas cette confirmation. Une action renseignée mais invalide reste bloquante à la publication ; aucune URL générique n'est créée pour la remplacer.
- La collecte d'e-mail avant le jeu est une option indépendante des actions marketing. Elle ne doit jamais être traitée comme une action de visite.
- L'objectif choisi lors de la création sert uniquement à proposer une configuration initiale des actions. Après publication, sa modification ne doit pas écraser les actions configurées.
- Décision propriétaire #553 : le Wizard masque ce choix et utilise `review_prompt` (« Obtenir des avis ») pour les nouveaux jeux. Une édition conserve l'objectif, les actions et la collecte e-mail enregistrés ; aucune conversion de campagne ni action sans URL renseignée n'est déclenchée par ce masquage.
- Une invitation à laisser un avis doit rester indépendante : elle ne conditionne ni l'accès au jeu ni l'attribution d'un lot.

## Prévisualisation

- La prévisualisation utilise un lien ou QR code temporaire distinct du QR code de diffusion.
- Ses participations sont explicitement identifiées comme des tests ; elles ne décrémentent pas le stock et n'alimentent pas les indicateurs de production.
- Le parcours de prévisualisation doit permettre de tester l'ensemble du parcours, y compris l'e-mail de gain de test.
- Un jeton de prévisualisation expiré ou invalide doit conduire à un écran compréhensible, sans exposer de donnée interne.

## Gain et retrait

- Un gain obtenu donne accès à un code et un QR code de retrait, ainsi qu'aux conditions de disponibilité applicables.
- Les indicateurs « lots utilisés » et « taux de consommation » sont calculés à partir des gains attribués et des retraits effectifs, jamais du stock initial ou disponible. Un lot à stock illimité compte comme tout autre lot : taux de consommation = nombre de lots retirés ÷ nombre de lots gagnés × 100 ; si aucun lot n'a été gagné, le taux est de 0 %.
- La page de retrait doit afficher au personnel le lot, les conditions, la période de validité et le statut du retrait avant confirmation.
- Le retrait standard est confirmé au moyen du PIN marchand et journalisé.
- Un retrait forcé reste possible pour le marchand ou le personnel du commerce, y compris hors période de validité. Il exige la saisie d'un motif et du PIN marchand avant confirmation.
- Tout retrait forcé doit être journalisé avec, au minimum, sa date, l'établissement, le jeu, le gain, le code de retrait, le motif et le statut final. L'identité de la personne qui l'a confirmé ne peut pas être tracée tant qu'aucun compte personnel n'est prévu pour le personnel.

## Données, consentement et conservation

- Les données strictement nécessaires à l'exécution du jeu ou à l'envoi d'un gain peuvent être demandées lorsque cette exécution le justifie. L'information présentée au joueur doit expliquer cette finalité.
- Le consentement à la prospection marketing est une case distincte, décochée par défaut, spécifique et révocable. Il ne conditionne ni la participation au jeu ni la réception ou le retrait d'un gain.
- Une case obligatoire peut recueillir l'acceptation des règles du jeu et l'information relative au traitement nécessaire à la participation ; elle ne doit pas être libellée comme un consentement marketing.
- Une durée de conservation illimitée des données personnelles n'est pas autorisée. La politique opérationnelle validée prévoit au maximum trois ans en base active, puis un archivage à accès restreint jusqu'à cinq ans, avant suppression ou anonymisation. Cette politique reste soumise à validation juridique par finalité.
- À défaut de politique validée, aucune durée n'est encore figée dans le produit. Une durée paramétrable par marchand ne pourra être proposée que dans les limites de la politique centrale d'Okado, avec une valeur par défaut et un plafond conformes.

### Proposition de politique à valider avant implémentation

| Catégorie | Finalité | Proposition de conservation | Sort à l'échéance |
|---|---|---|---|
| Données personnelles de contact et de participation | Exécution du jeu, communications autorisées, preuve du gain et gestion des réclamations | 3 ans en base active, puis archivage restreint jusqu'à 5 ans maximum, à compter du dernier événement métier pertinent | Suppression ou anonymisation à 5 ans ; les oppositions nécessaires restent limitées à ce qui est strictement utile. |
| QR codes et jetons de prévisualisation | Test temporaire du parcours | Durée courte liée à l'expiration du jeton | Suppression automatique. |
| Données agrégées | Statistiques produit sans ré-identification | Sans limite si l'anonymisation est effective | Conservation des seules données anonymes. |

Les durées ci-dessus restent des propositions par finalité, non un avis juridique.
Le SQL historique `20260831_personal_data_lifecycle.sql` existe et calcule ses
seuils depuis `created_at`, pas depuis le dernier événement métier. Il ne prouve
ni l'activation de la maintenance, ni une politique adaptée à toutes les données.
Le [dossier #508](DATA_PROCESSING_REGISTER.md) distingue les finalités et les preuves manquantes.

### Mesure d'usage — accord propriétaire du 15 octobre 2026, #508

Le propriétaire autorise la mise en place du consentement préalable recommandé.
PostHog et Vercel Analytics suivent le choix explicite présenté pour les domaines
Okado nommés dans l'information. Accepter et refuser ont la même visibilité ;
le refus ne conditionne aucun parcours métier. La préférence dure au maximum
180 jours sans renouvellement à la visite et reste modifiable via Gérer les cookies.
Sans accord valide, le SDK PostHog n'est pas initialisé et la capture produit
serveur est bloquée. Le retrait arrête les nouvelles captures et efface les
identifiants PostHog de ce navigateur ; l'effacement des données déjà hébergées
est une demande distincte. Le suivi d'acquisition ne décrit donc que les personnes
ayant accepté cette mesure. Aucune autorisation de purge n'est déduite de cet accord.

Décision propriétaire du 18 octobre 2026 (#592) : utiliser une identité de
compte stable entre établissements et afficher l'e-mail de connexion dans le
profil PostHog des utilisateurs connectés ayant accepté la mesure. L'adresse
provient de la session/payload authentifié ; elle peut être actualisée sans
changer d'identité. Cette exception porte sur le profil du compte, pas sur les
coordonnées des joueurs ou les propriétés libres des événements. La mention
de mesure et la politique publique précisent cet usage. Aucun nom, mot de passe,
PIN, contenu de campagne ou e-mail de joueur n'est ajouté.

## Relance d’expiration du gain — #304

Décisions propriétaire du 12 octobre 2026 : préférence commune au compte marchand et à ses établissements, désactivée par défaut, délai personnalisable (7 jours initialement). Le destinataire est le gagnant, pas le marchand. Une seule relance par gain réel encore disponible/non retiré, à validité initiale d’au moins 20 jours, le jour civil J−N calculé dans le fuseau du site, lors du passage quotidien Vercel ; aucun rattrapage d’un jour passé. Le propriétaire confirme que 9 h est approximatif : la fenêtre de cinq minutes et la planification Supabase spécifique sont abandonnées. L’activation/modification avant le passage effectif du jour est prise en compte ; aucun rappel antérieur n’est rejoué. Le changement de délai ne rejoue pas une relance déjà tentée/transmise. Paramétrage par propriétaire/administrateur du compte, contrôle serveur et isolation des comptes. Envoi Resend existant, pas de nouvelle offre Vercel. Le format reprend l’e-mail initial, sans changer celui-ci, les conditions/dates, stocks, retrait ou consentement. Désactivation revérifiée avant déclenchement ; une requête fournisseur déjà déclenchée ne peut être rappelée. [Limites temporelles, données et recette](releases/reward-expiry-reminders-304.md).

## Notifications de gains aux utilisateurs d’établissement (Issue #473)

- Décision propriétaire : les tâches de notifications et leurs reprises n’exécutent pas de purge. La maintenance historique requiert une activation opérationnelle distincte et explicite ; elle reste désactivée par défaut. Configurer l’authentification du planificateur ne vaut pas autorisation de supprimer des données.

- Les notifications destinées aux utilisateurs d’établissement gardent un ton professionnel : aucun émoticône cadeau ajouté par le modèle dans l’objet, le titre, le contenu HTML ou la version texte (retour propriétaire sur la PR #474). Les libellés dynamiques et l’e-mail de gain du participant ne sont pas modifiés par cette décision.
- Préférence personnelle par utilisateur et établissement autorisé, désactivée par défaut. L’adresse destinataire vient du compte ; les droits actifs et l’adresse courante sont revérifiés avant chaque envoi.
- Pilotage → Voir la fiche consulte cette préférence pour l’utilisateur de la ligne et le site autorisé sélectionné, sans la modifier. L’association utilisateur/compte est contrôlée côté serveur avant lecture ; aucun mélange des sites ou préférences des autres membres. Aucune ligne = désactivé ; un échec de base n’est pas une préférence désactivée.
- Seuls les gains réels persistés après activation sont notifiés (roue ou ticket, collecte avant ou après jeu). Ni perte, ni participation simulée, ni ancien gain rejoué.
- Synthèses quotidienne, hebdomadaire et mensuelle sur périodes locales closes, lors d'un passage quotidien le matin en heure de France, à horaire indicatif (choix propriétaire, sans garantie de 9 h ni changement de forfait). Le seuil SQL de 9 h locale reste une condition d'éligibilité, pas une promesse de réception ; hors du fuseau français une période peut attendre le passage suivant. Aucun e-mail vide. Listing détaillé complet par date/heure, prénom et nom, jeu et lot, fractionné en parties numérotées si nécessaire.
- Décision propriétaire du 6 octobre : prénom et nom de la participation autorisés dans l’alerte immédiate et les synthèses. Pas d’e-mail du joueur, QR, code de retrait ni accès public aux résultats. Le lien Mon compte vérifie les droits sur l’établissement et ne modifie pas les préférences. La modification des préférences n’affecte pas la collecte, le résultat, le stock, le consentement, le retrait ou l’e-mail du joueur.
- Les tentatives ambiguës ne sont pas rejouées automatiquement au-delà de la fenêtre d’idempotence du fournisseur. Une désactivation stoppe les envois non encore acceptés. Les noms sont lus lors de la préparation, uniquement dans le snapshot/payload privé, jamais dans les événements ni les logs. Ces snapshots sont expurgés après acceptation, annulation et effacement d’une participation ; aucun archivage nominatif supplémentaire.

## Règle de changement

Toute modification de ce document exige une Issue non triviale, une analyse d'impact et les tests adaptés. Les changements de ce document priment sur les comportements implicites du code existant.
