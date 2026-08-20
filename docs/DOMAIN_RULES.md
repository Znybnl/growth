# Règles métier — Okado

Ce document regroupe les invariants fonctionnels approuvés d'Okado. Il ne remplace pas un avis juridique. Toute évolution du consentement, des données personnelles, des avis Google ou des règles de retrait doit être validée par le propriétaire avant implémentation.

## Autorité et périmètre

- Pierre-Henri BRUNELLE est l'administrateur de la plateforme et l'unique valideur des PR, merges et déploiements en production.
- Chaque marchand est responsable de traitement des données de ses contacts : il décide de l'usage des contacts, du respect du règlement de son jeu et de la remise des lots à ses clients.
- Okado agit comme sous-traitant technique pour les traitements réalisés au moyen de la plateforme, conformément aux instructions documentées du marchand et au contrat applicable.
- Un marchand ne consulte et ne pilote que ses établissements, ses jeux, ses résultats et ses paramètres autorisés.
- Le personnel du commerce ne possède pas de compte Okado dédié. Il peut ouvrir la page de retrait avec le QR code présenté par le joueur et confirme la remise avec le PIN marchand.
- Un joueur ne peut pas accéder à l'espace marchand depuis les parcours publics de jeu ou de retrait.

## Cycle de vie d'un jeu

- Un jeu peut être enregistré en **brouillon**, même incomplet.
- La publication d'un jeu est bloquée tant que les données obligatoires ou les règles de dotation ne sont pas valides.
- Un brouillon reste prévisualisable, mais son QR code de diffusion ne doit pas être présenté comme un QR code public actif.
- Le mot **jeu** est utilisé dans l'interface ; **campagne** est réservé aux usages techniques ou historiques.

## Dotations et probabilités

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
- La page de retrait doit afficher au personnel le lot, les conditions, la période de validité et le statut du retrait avant confirmation.
- Le retrait standard est confirmé au moyen du PIN marchand et journalisé.
- Un retrait forcé reste possible pour le marchand ou le personnel du commerce, y compris hors période de validité. Il exige la saisie d'un motif et du PIN marchand avant confirmation.
- Tout retrait forcé doit être journalisé avec, au minimum, sa date, l'établissement, le jeu, le gain, le code de retrait, le motif et le statut final. L'identité de la personne qui l'a confirmé ne peut pas être tracée tant qu'aucun compte personnel n'est prévu pour le personnel.

## Données, consentement et conservation

- Les données strictement nécessaires à l'exécution du jeu ou à l'envoi d'un gain peuvent être demandées lorsque cette exécution le justifie. L'information présentée au joueur doit expliquer cette finalité.
- Le consentement à la prospection marketing est une case distincte, décochée par défaut, spécifique et révocable. Il ne conditionne ni la participation au jeu ni la réception ou le retrait d'un gain.
- Une case obligatoire peut recueillir l'acceptation des règles du jeu et l'information relative au traitement nécessaire à la participation ; elle ne doit pas être libellée comme un consentement marketing.
- Une durée de conservation illimitée des données personnelles n'est pas autorisée. Chaque finalité doit disposer d'une durée ou d'un critère de calcul documenté, puis conduire à l'effacement, l'archivage justifié ou l'anonymisation.
- À défaut de politique validée, aucune durée n'est encore figée dans le produit. Une durée paramétrable par marchand ne pourra être proposée que dans les limites de la politique centrale d'Okado, avec une valeur par défaut et un plafond conformes.

### Proposition de politique à valider avant implémentation

| Catégorie | Finalité | Proposition de conservation | Sort à l'échéance |
|---|---|---|---|
| Contact ayant accepté la prospection | Communications marketing du marchand | 3 ans à compter du dernier contact actif du prospect | Suppression ou anonymisation ; conservation minimale des informations d'opposition dans une liste dédiée. |
| Participation, gain et retrait | Exécution du jeu, preuve du gain et gestion des réclamations | 5 ans après la clôture du jeu ou le retrait, à confirmer juridiquement | Archivage à accès restreint ou anonymisation. |
| QR codes et jetons de prévisualisation | Test temporaire du parcours | Durée courte liée à l'expiration du jeton | Suppression automatique. |
| Données agrégées | Statistiques produit sans ré-identification | Sans limite si l'anonymisation est effective | Conservation des seules données anonymes. |

Les durées de la deuxième ligne constituent une recommandation opérationnelle, non un avis juridique. Toute modification de ces règles exige une décision explicite du propriétaire et, si nécessaire, une validation juridique.

## Règle de changement

Toute modification de ce document exige une Issue non triviale, une analyse d'impact et les tests adaptés. Les changements de ce document priment sur les comportements implicites du code existant.
