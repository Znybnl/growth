# Règles métier — Okado

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

- Le catalogue de suggestions est indépendant des lots déjà enregistrés dans les jeux. Sa refonte ne modifie aucun lot, gain, stock, coût, condition ou probabilité existant (issue #466, décision propriétaire du 6 octobre 2026).
- Les six sous-secteurs Beauté sont : Beauté généraliste / multi-activité, Coiffure, Ongles, Regard — cils & sourcils, Massage & Spa, Soins visage & corps. Les anciennes catégories ambiguës ne sont conservées que si un établissement ou une suggestion les utilise ; aucune reclassification automatique. Les suggestions personnalisées restent intactes.
- Les probabilités de bibliothèque sont des valeurs individuelles proposées, pas une distribution à normaliser. Seuls les lots choisis entrent dans le calcul du jeu.
- À l'ajout d'une suggestion Beauté, sa condition suggérée préremplit les conditions d'utilisation. « Achat requis pour le retrait » est activé lorsque cette condition impose une prestation payante ou une nouvelle pose ; une réduction à tarif normal ou un cadeau autonome ne l'active pas. Ces réglages restent modifiables, sans recalcul rétroactif sur les lots existants.

- Un lot publiable doit avoir un libellé, une quantité disponible strictement positive et des conditions de retrait cohérentes.
- Lorsque « Jeu 100 % gagnant » est activé, la somme des probabilités des lots doit être exactement égale à 100 % au moment de la publication.
- La modification opérationnelle du stock concerne le **stock disponible** ; le stock initial reste la référence de création.
- Les anomalies de dotation doivent être affichées dans la section concernée avant la publication.

## Parcours joueur et actions marketing

- Les actions marketing sont proposées avant la participation au jeu.
- Les actions sont séquencées par visite : action 1 pour la première visite, action 2 pour la deuxième, puis ainsi de suite.
- La collecte d'e-mail avant le jeu est une option indépendante des actions marketing. Elle ne doit jamais être traitée comme une action de visite.
- L'objectif choisi lors de la création sert uniquement à proposer une configuration initiale des actions. Après publication, sa modification ne doit pas écraser les actions configurées.
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

Les durées de la deuxième ligne constituent une recommandation opérationnelle, non un avis juridique. Toute modification de ces règles exige une décision explicite du propriétaire et, si nécessaire, une validation juridique.

## Notifications de gains aux utilisateurs d’établissement (Issue #473)

- Les notifications destinées aux utilisateurs d’établissement gardent un ton professionnel : aucun émoticône cadeau ajouté par le modèle dans l’objet, le titre, le contenu HTML ou la version texte (retour propriétaire sur la PR #474). Les libellés dynamiques et l’e-mail de gain du participant ne sont pas modifiés par cette décision.
- Préférence personnelle par utilisateur et établissement autorisé, désactivée par défaut. L’adresse destinataire vient du compte ; les droits actifs et l’adresse courante sont revérifiés avant chaque envoi.
- Seuls les gains réels persistés après activation sont notifiés (roue ou ticket, collecte avant ou après jeu). Ni perte, ni participation simulée, ni ancien gain rejoué.
- Synthèses quotidienne, hebdomadaire et mensuelle sur périodes locales closes, lors d'un passage quotidien le matin en heure de France, à horaire indicatif (choix propriétaire, sans garantie de 9 h ni changement de forfait). Le seuil SQL de 9 h locale reste une condition d'éligibilité, pas une promesse de réception ; hors du fuseau français une période peut attendre le passage suivant. Aucun e-mail vide. Listing détaillé complet par date/heure, prénom et nom, jeu et lot, fractionné en parties numérotées si nécessaire.
- Décision propriétaire du 6 octobre : prénom et nom de la participation autorisés dans l’alerte immédiate et les synthèses. Pas d’e-mail du joueur, QR, code de retrait ni accès public aux résultats. Le lien Mon compte vérifie les droits sur l’établissement et ne modifie pas les préférences. La modification des préférences n’affecte pas la collecte, le résultat, le stock, le consentement, le retrait ou l’e-mail du joueur.
- Les tentatives ambiguës ne sont pas rejouées automatiquement au-delà de la fenêtre d’idempotence du fournisseur. Une désactivation stoppe les envois non encore acceptés. Les noms sont lus lors de la préparation, uniquement dans le snapshot/payload privé, jamais dans les événements ni les logs. Ces snapshots sont expurgés après acceptation, annulation et effacement d’une participation ; aucun archivage nominatif supplémentaire.

## Règle de changement

Toute modification de ce document exige une Issue non triviale, une analyse d'impact et les tests adaptés. Les changements de ce document priment sur les comportements implicites du code existant.
