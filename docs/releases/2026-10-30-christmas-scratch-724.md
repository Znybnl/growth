# Nouveaux tickets festifs — #724

## Résultat et périmètre

Quatre modèles de ticket à gratter sont ajoutés pour tous les secteurs : Noël
sapin & cadeaux, Noël champagne, Noël rétro et Noël noir & or. Ils s'ajoutent
aux trois modèles Noël déjà disponibles dans le sélecteur commun des deux
éditeurs. Les textes de campagne et le logo sont rendus par l'application et
restent modifiables. Aucun texte, logo ou contour de téléphone n'est incrusté
dans les fonds.

Les modèles sapin, champagne et noir & or utilisent une zone à gratter en forme
de peinture dorée irrégulière ; le modèle rétro utilise un ticket rouge détouré,
bordé d'or, avec une zone argentée interne. Chaque zone reste le canvas tactile
existant, conserve une texture métallique opaque et révèle exactement le résultat
calculé par le jeu. Les dimensions de travail du canvas suivent le rapport du
masque de chaque modèle.

## Fonds et compatibilité

- Fonds raster générés à partir des quatre références, puis optimisés en WebP
  (environ 0,7 Mo cumulés). Ils contiennent uniquement le décor : feuillages,
  rubans, rayons ou éclats, sans texte, logo, appareil ou masque de grattage.
- Le fond natif est appliqué au rendu du modèle sans écriture dans les champs
  partagés du marchand. Une image importée ou choisie dans la bibliothèque
  reste prioritaire ; une couleur personnalisée désactive le fond natif.
- Identifiants ajoutés à la validation des campagnes et au type partagé ; aucun
  changement SQL ni écriture sur les campagnes existantes.
- Le tirage, les probabilités, les stocks, les événements de participation, les
  actions marketing et le parcours de retrait restent inchangés.

## Sources et prompts des fonds

Générés avec l'outil ImageGen intégré, format vertical mobile 9:19, puis convertis
en WebP qualité 84 :

1. **Sapin** : papier ivoire, branches de sapin et boules rouges/or sur les bords,
   rubans rouge-or et cadeau en bas, large colonne centrale calme.
2. **Champagne** : papier ivoire, rubans satinés dorés aux coins et bords,
   confettis dorés fins et cadeau en bas à droite, centre dégagé.
3. **Rétro** : rayons ivoire, menthe, vert, jaune et corail façon affiche vintage,
   texture papier imprimé et étoiles périphériques, centre dégagé.
4. **Noir & or** : fond noir mat et satin, rubans et éclats dorés aux bords,
   cadeau discret en bas et centre sombre calme.

Chaque prompt excluait explicitement téléphone, cadre, logo, lettres, texte,
ticket et zone à gratter pour que l'interface conserve sa personnalisation.

## Vérifications

- Tests unitaires de chaque identifiant, paramètres par défaut, fonds natifs,
  remplacement manuel, texture et compatibilité du modèle.
- E2E mobiles 320/390 px pour l'aperçu public, la zone opaque, le grattage,
  l'unique démarrage/révélation, et le changement de fond.
- E2E visuels à 1280×720 et 1280×600 dans les deux éditeurs, plus captures de
  la miniature, de l'aperçu intégré et du mode de prévisualisation.
- Lint et build de l'application.

## Recette et retour arrière

Dans un jeu brouillon, choisir chaque nouveau style, remplacer le fond avec une
image importée puis une image de la bibliothèque, modifier logo et textes, puis
prévisualiser et gratter le ticket. Vérifier que l'aperçu et le jeu public gardent
le même décor et la même géométrie.

Pour retirer la fonctionnalité avant une publication, revenir au commit précédent.
Après usage des nouveaux identifiants dans des jeux, il faut d'abord les remplacer
par un identifiant de modèle encore pris en charge avant de supprimer leurs rendus.
