# Glossaire métier — Okado

Utiliser ces termes dans l'interface, les Issues, les critères d'acceptation, les tests et la documentation. Les termes techniques historiques sont conservés seulement lorsque cela est nécessaire pour le code ou la base de données.

| Terme | Définition officielle | Ne pas confondre avec | Exemple |
|---|---|---|---|
| Jeu | Animation visible par le client, créée et pilotée par un marchand. | Campagne, qui est le terme technique/historique. | « Publier le jeu de rentrée ». |
| Campagne | Nom de la rubrique de navigation qui regroupe les jeux du marchand, et terme technique/historique pour leur enregistrement persistant. | Un jeu individuel. | « Ouvrir Campagnes » ; `campaign_id` dans la base de données. |
| Administrateur plateforme | Pierre-Henri BRUNELLE, unique administrateur de la plateforme et valideur des PR. | Marchand ou personnel du commerce. | Administration de la plateforme. |
| Marchand | Compte professionnel qui possède et pilote un ou plusieurs établissements. | Client/joueur. | « Le marchand crée un jeu ». |
| Établissement | Site physique d'un marchand, avec ses informations et ses jeux propres. | Workspace. | « Le Comptoir des Îles · Nanterre ». |
| Secteur d’activité | Catégorie générale de l’activité d’un établissement, utilisée pour contextualiser les réglages et les suggestions de lots. Elle peut rester non renseignée. | Sous-secteur. | Beauté, Restauration, Services. |
| Sous-secteur | Spécialité facultative du secteur Beauté : Beauté généraliste / multi-activité, Coiffure, Ongles, Regard — cils & sourcils, Massage & Spa ou Soins visage & corps. Une ancienne valeur n'est conservée que si référencée. | Secteur d’activité. | Regard — cils & sourcils. |
| Multi-sites | Fonction qui permet à un marchand de gérer plusieurs établissements. | Workspace. | « Déployer ce jeu sur plusieurs sites ». |
| Workspace | Conteneur technique d'organisation auquel sont rattachés les marchands, utilisateurs et établissements autorisés. | Établissement. | Un workspace peut contenir plusieurs établissements. |
| Joueur | Client final qui accède au jeu et y participe. | Marchand ou personnel du commerce. | « Le joueur scanne le QR code ». |
| Participation | Tentative de jeu enregistrée pour un joueur et une visite données. | Scan ou action marketing. | Une participation peut produire un gain ou une perte. |
| Visite | Rang de participation d'un joueur dans un jeu, utilisé pour proposer l'action marketing suivante. | Session technique. | La deuxième visite propose l'action 2. |
| Scan | Ouverture du jeu à partir d'un QR code de diffusion. | Participation. | Un scan peut ne jamais devenir une participation. |
| Action marketing | Action proposée au joueur avant le jeu : avis Google, suivi social ou lien personnalisé. | Collecte d'e-mail. | « Suivre sur Instagram ». |
| Collecte d'e-mail | Option indépendante qui demande les coordonnées du joueur avant de jouer. | Action marketing ou e-mail de gain. | « Collecter l'e-mail avant le jeu ». |
| Lot | Dotation pouvant être remportée : son libellé, sa probabilité, son stock et ses conditions sont configurés par le marchand. | Gain ou retrait. | « Une réduction de 10 % ». |
| Gain | Résultat attribué au joueur lorsqu'un lot est remporté. | Lot, qui définit la dotation avant attribution. | « Café offert gagné ». |
| Stock initial | Quantité de lots définie à la création. Elle sert de référence et n'est pas réécrite lors d'un ajustement opérationnel. | Stock disponible. | 100 réductions initialement prévues. |
| Stock disponible | Quantité de lots encore attribuable ou ajustée par le marchand. | Stock initial. | 37 réductions disponibles. |
| Jeu 100 % gagnant | Règle imposant que la somme des probabilités des lots soit exactement de 100 %. | Une campagne avec un lot majoritaire. | Chaque participation reçoit un lot. |
| Retrait | Remise effective d'un gain par le personnel du commerce. | Gain ou validation de participation. | « Valider un retrait ». |
| Lot utilisé | Lot gagné dont le retrait a été effectivement confirmé. Sa mesure ne dépend pas du stock du lot. | Lot attribué mais pas encore retiré. | Un retrait confirmé compte aussi lorsque le lot est à stock illimité. |
| Taux de consommation | Nombre de lots utilisés divisé par le nombre de lots gagnés, multiplié par 100 ; vaut 0 % en l'absence de gain. | Quantité de stock initial consommée. | 2 lots utilisés sur 4 gagnés = 50 %. |
| Code de retrait | Code unique associé à un gain, utilisable par le personnel pour ouvrir sa page de validation. | PIN marchand. | `OKA-XXXXXX`. |
| QR code de retrait | QR code présenté par le joueur au personnel pour ouvrir la page de validation du gain. | QR code de diffusion. | QR inclus dans l'e-mail de gain. |
| PIN marchand | Code secret du commerce utilisé pour confirmer un retrait. | Code de retrait du joueur. | `0000` par défaut tant qu'il n'est pas personnalisé. |
| Personnel du commerce | Employé qui remet un lot. Il n'a pas de compte dédié à la plateforme et utilise le QR de retrait du client, puis le PIN marchand. | Marchand ou administrateur plateforme. | Validation d'un retrait en point de vente. |
| QR code de diffusion | QR code destiné aux clients pour accéder au jeu de production. | QR code de prévisualisation ou de retrait. | QR affiché sur l'affiche du jeu. |
| Prévisualisation | Mode de test isolé du jeu, accessible par lien ou QR code temporaire. | Production. | Tester une roue sans modifier les stocks. |
| Affiche | Support imprimable A4/A5 du jeu contenant son QR code de diffusion. | Page de jeu mobile. | « Personnaliser l'affiche ». |
| Brouillon | Jeu enregistré sans être publié ; il peut être incomplet. | Jeu actif. | Un brouillon est prévisualisable. |
| Jeu actif | Jeu publié et accessible au public par son QR code de diffusion. | Brouillon. | Le jeu peut recevoir des participations de production. |
| E-mail de gain | E-mail transactionnel envoyé au joueur après un gain avec les informations de retrait. | Collecte d'e-mail. | Objet contenant le nom du lot remporté. |
| Notification de gains | Alerte personnelle envoyée à l’utilisateur d’un établissement pour ses gains réels, activable dans Mon compte. | E-mail de gain du joueur. | Synthèse quotidienne des gains de l’établissement. |
| Synthèse de gains | E-mail récapitulant une période close et contenant une ligne par gain : date/heure, prénom et nom du participant, jeu et lot. | Consommation ou retrait des lots. | Synthèse de la semaine précédente, le lundi à partir de 9 h locale. |
| Lead | Enregistrement d'un joueur/participant utilisable par le marchand dans les résultats. | Simple scan. | Contact ayant laissé son e-mail. |

## Catalogue de suggestions — issue #466

- **Suggestion de lot** : proposition réutilisable avec libellé, probabilité, coût estimé et description ; ce n'est pas un lot enregistré dans un jeu.
- **Condition suggérée** : pour le catalogue Beauté, texte de la suggestion qui préremplit les conditions d'utilisation du nouveau lot, modifiable par le marchand.
- **Sous-secteur Beauté** : spécialité déclarée par l'établissement, utilisée pour choisir la bibliothèque ; sans spécialité, repli vers Beauté généraliste / multi-activité sans modifier son profil.
- **Catégorie historique ambiguë** : « Institut & soins » ou « Ongles & cils », conservée uniquement si utilisée, sans attribution automatique à une nouvelle spécialité.

## Règles de rédaction

- Un terme porte un seul sens. Si un nouveau sens est nécessaire, créer une nouvelle entrée.
- Préférer la forme affichée dans l'interface : **jeu**, **retrait**, **établissement**, **multi-sites**.
- Les critères d'acceptation et les tests doivent reprendre les termes du tableau, sans synonymes.
- Ajouter une entrée avant d'introduire un nouveau concept durable dans le produit.
