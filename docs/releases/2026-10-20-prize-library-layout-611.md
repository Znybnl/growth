# Fenêtre des idées de lots — #611

## Constat et limites de l'analyse

La capture propriétaire montre le rendu de la fenêtre générique (672 px),
sans limite de hauteur, alors que #610 prévoit une bibliothèque dédiée.
Le 20 octobre, la feuille CSS globale référencée par le HTML public de
`app.okado.app/connexion` ne contient ni `.okado-prize-library` ni
`.okado-prize-editor`, malgré leur présence dans le commit source `1ff7738`.
Le défaut est donc cohérent avec une absence des styles spécifiques dans les
ressources servies, pas seulement avec un catalogue trop long. La cause exacte
de cette divergence de ressources/cache n'est pas démontrée par ce seul constat.

## Correction ciblée

Les styles de la bibliothèque sont importés directement par son composant
dans un module CSS. Ils ne dépendent plus de sa règle dans la feuille globale.
Les autres dialogues et le panneau d'édition ne sont pas refondus.

- Largeur maximale de 960 px et marge de 24 px sur ordinateur.
- Hauteur naturelle sur ordinateur, plafonnée à 896 px / hauteur utile du
  viewport moins 48 px ; les catalogues courts, vides et en erreur restent compacts.
- En-tête et pied non rétractables ; seul le catalogue défile.
- Plein écran sous 640 px, une colonne, prise en compte des safe areas.
- Deux colonnes sur ordinateur, cartes plus compactes, informations Chance/Coût
  réunies avec l'ajout dans un pied de carte, boutons secondaires moins dominants.
- Texte d'introduction raccourci ; titre, fermeture, compteur et Terminer conservés.

Aucun calcul métier, catalogue, API, identifiant ou stock modifié. Les conditions
restent intégralement visibles. Ajout multiple, doublons et ajustement explicite
des probabilités suivent #609 sans changement. Aucune migration SQL.

## Corrections de l'audit approuvées le 21 octobre

- Après un ajout : conserver le défilement et placer le focus sur le prochain
  bouton d'ajout entièrement visible, sinon sur Terminer. Ne pas renvoyer le
  clavier au premier lot hors écran. Les frames de focus sont annulées à la fermeture.
- Après annulation de l'ajustement : retrouver la bonne carte et sa position,
  sans ajout ni modification des autres lots. Action explicite « Annuler l’ajout »
  dans le pied, à côté de la confirmation. L'ouverture d'un ajustement repart
  au début de son contenu pour ne pas masquer son premier lien.
- « Chances restantes à répartir » remplace le compteur ambigu « % disponibles ».
- Mention des coûts indicatifs et du coût supporté par l'établissement, distinct
  de la valeur pour le joueur. À 100 %, expliquer l'ajustement nécessaire avant
  l'enregistrement du jeu ; conserver les dépassements provisoires approuvés.
- Police de 13 px pour conditions, métadonnées, compteurs et ajouts.
- Afficher le secteur et, pour Beauté, le sous-secteur renseignés de l'établissement.
  Ce contexte est déclaratif ; le catalogue et ses éventuels replis sont inchangés.
- Largeur de 960 px conservée. Mes lots / Compositions / budget restent hors périmètre.

## Vérifications et recette

Après corrections de l'audit le 21 octobre : 16 E2E réussis, lint sans erreur
(quatre avertissements préexistants), build réussi et huit contrôles compilés
réussis (cinq viewports et trois hauteurs naturelles court/vide/erreur).
Captures de la grille, de l'annulation et des états courts inspectées à
1280×720/600 et sur mobile. Contrôle React : état dérivé sans nouvel appel
réseau, références de focus locales, frame annulée à la fermeture et
conditions d'affichage/accessibilité préservées. Aucune donnée réelle modifiée.

Résultats locaux du 20 octobre : lint sans erreur (quatre avertissements
préexistants hors périmètre), build réussi, 14 E2E composition/bibliothèque/audit
réussis ; scénario de géométrie rejoué après le réglage final de la hauteur.
Les cinq contrôles avec les CSS compilés sont réussis. Captures inspectées
à 1280×720/600, 1894×1040 et 320/390 px. `git diff --check` réussi.

Rejouer `wizard-prize-library.spec.ts`, `wizard-prize-audit.spec.ts` et
`wizard-prize-composition.spec.ts`. Le scénario de géométrie inclut la résolution
1894×1040 de la capture, 1280×720/600 et les mobiles 320×600 / 390×740.
Inspecter les captures du catalogue, des états ajoutés et de l'ajustement.

Après `npm run build -w @okado/web-app`, exécuter
`npm run smoke:prize-library -w @okado/web-app` : le vrai composant est rendu
avec les CSS émis par le build, sur les cinq viewports. Seule l'enveloppe portail
est remplacée par son markup pour le rendu statique ; aucun accès serveur,
aucune session, mutation ou transmission d'e-mail. La CI exécute aussi ce smoke.

Recette propriétaire sur la preview : ouvrir Idées de lots avec un catalogue
de sept idées ou plus, vérifier titre et actions, défiler jusqu'au dernier lot,
l'ajouter, puis ajouter un lot excédant la part disponible et ajuster sa chance.
Rejouer à petite hauteur et sur mobile. Le retour à la composition doit conserver
les ajouts sans publier le jeu.

Retour arrière : revert de la PR, sans traitement de données. Production
uniquement après validation explicite du propriétaire.
