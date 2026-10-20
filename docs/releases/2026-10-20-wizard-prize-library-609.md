# Bibliothèque de lots — phase 2, #609 / PR #610

## Périmètre livré

La phase 2 ajoute une bibliothèque centrée « Ajouter des lots » accessible par
« Trouver des idées de lots ». Les cartes de suggestions reprennent le
catalogue existant pour le secteur/sous-secteur de l’établissement : aucun
nouveau catalogue, table, migration ou changement du moteur de tirage.

Deux colonnes sur bureau, une sur mobile. La fenêtre fait 864 px au maximum
sur bureau et occupe l’écran mobile. En-tête et actions restent accessibles ;
seul le contenu défile. Le chargement, l’erreur avec réessai et l’absence de
suggestions ont chacun un état explicite. La création manuelle reste accessible
depuis la composition, y compris sans suggestion.

Les suggestions s’ajoutent successivement sans fermer la bibliothèque. Leurs
cartes passent à « Ajouté » et le bouton est désactivé. Le parent vérifie aussi
la présence avant chaque ajout, y compris sur double-clic. Un identifiant de
brouillon reconnaît les ajouts de cette session après personnalisation ; les
lots existants de même nom et conditions sont également reconnus. La suppression
permet un nouvel ajout ; la duplication volontaire reste disponible dans la
composition.

Les valeurs passent par le mapping existant : nom, probabilité, coût,
conditions et indicateur d’achat requis, stock initial illimité. Modifier ces
copies ne modifie pas les suggestions du catalogue.

## Probabilités

Quand la probabilité proposée dépasse la part disponible, un ajustement
explicite s’ouvre dans la même fenêtre. La valeur suggérée reste affichée.
Le marchand peut ajouter avec la part restante proposée, saisir une autre
valeur ou revenir aux suggestions sans ajout. Aucun autre lot n’est rééquilibré.

Conformément au retour propriétaire de la phase 1, le marchand peut aussi
confirmer un total provisoire supérieur à 100 %, avec une alerte unique avant
le clic. L’enregistrement du jeu reste bloqué jusqu’à correction. La part
perdante reste calculée et ne crée aucun lot en base.

## Contrôles

`e2e/wizard-prize-library.spec.ts` couvre les ajouts successifs, double-clic,
état Ajouté après fermeture/personnalisation, suppression/réajout, annulation
d’un ajustement, choix explicite de la part restante, dépassement provisoire,
champs envoyés lors de l’enregistrement et absence de lot PERDU dans l’API.
Il teste aussi chargement/erreur/réessai/vide, deux colonnes à 1280 px,
plein écran à 320/390 px, clavier et retour du focus. Réseau intercepté :
aucune écriture de données ou émission d’e-mail réelle.

Captures à 1280 × 720/600 et 320/390 px inspectées : cartes, ajustement,
champ de probabilité et actions disponibles. La suite phase 1 et la matrice
responsive existantes complètent ces contrôles. Le catalogue authentifié,
les sous-secteurs et son mapping sont vérifiés par `test:beauty-catalog`.

Les onglets « Mes lots » et « Compositions » appartiennent respectivement
aux phases 3 et 4 ; ils seront ajoutés avec leur fonctionnement effectif.
La synthèse du budget reste en phase 5. L’issue reste ouverte.

Retour arrière : revert des commits de bibliothèque, sans migration.
