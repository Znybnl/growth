# Wizard : cartes, aperçu et actions — #600

## Résultat et analyse

- L’illustration du choix de jeu était limitée à 156 px de haut tout en
  conservant un SVG 340×180 en mode contain : la largeur laissée vide augmentait
  avec les cartes. Le panneau respecte désormais le même ratio que son dessin.
- L’aperçu compact utilisait des coefficients distincts pour le titre, le logo
  et les espacements, avec un sous-titre CSS dépendant encore du viewport de
  l’ordinateur. Le téléphone utilise maintenant un vrai viewport 390×844,
  commun à la prévisualisation interactive. Son cadre 414×868 est mis à
  l’échelle en bloc selon la largeur et la hauteur disponibles.
- Le renderer visuel partagé reçoit un mode mobile non réduit, emploie les
  composants de roue en cadrage public et les mêmes styles typographiques.
  La prévisualisation interactive conserve son bandeau de test et son parcours ;
  l’aperçu visuel reste un rendu statique du brouillon courant.
- La barre supérieure d’enregistrement était affichée uniquement au-delà de
  1200 px de largeur utile. Elle apparaît à toutes les largeurs et reste sticky.
  Sa hauteur réelle sert au placement des colonnes et des champs au focus.
- Retrait d’Aperçu en direct, Agrandir et Collection Beauté. Voir l’aperçu
  ouvre toujours le brouillon courant quand la colonne ne tient pas.
- Progression verticale 190 → 220 px. Promesse et sous-titre de roue : trois
  lignes visibles ; l’aide recommande trois lignes sans supprimer le texte
  Beauté existant accepté auparavant.
- Cartes communes : visuel 160 px, légende et badge de sélection, style clavier
  et grille identiques pour les collections Beauté et les autres modèles.
  Les miniatures standard comportent aussi logo, accroche et sous-titre ; les
  tickets utilisent un aperçu de carte centré. Le dessin d’Éclat est conservé.

## Données et sécurité

Aucune migration, dépendance ou route ajoutée. L’iframe contient un document
constant sans scripts, avec seulement le renderer React et les styles locaux
du site ; elle n’appelle aucun endpoint de jeu, ne reçoit pas de jeton de
prévisualisation et ne crée pas de campagne. Le contenu est inerte. Le mode de
test complet, l’authentification, les ACL, les validations et les endpoints de
sauvegarde/publication restent ceux du produit existant.

## Vérifications et recette

Les preuves visuelles utilisent le vrai MerchantShell et des données
synthétiques. Les API sont interceptées. Les captures à 1280×600/720, 390 px et
1920 px sont inspectées pour les choix de jeu, champs, actions et collections.
La comparaison de typographie porte sur les roues Nude, Botanique, Dynamique,
Signature, Moderne et les tickets Nude Élégance et Cadeau lilas.

Recette propriétaire : ouvrir une campagne en édition à 1280×600, faire
défiler Apparence puis Lots et contrôler les actions ; modifier trois lignes
de sous-titre et comparer avec Prévisualiser après sauvegarde ; ouvrir le
brouillon sur mobile puis fermer son aperçu avec Escape ; sélectionner un
modèle de chaque collection et contrôler son badge. Sur grand écran, vérifier
la progression et le téléphone entièrement cadré.

Retour arrière : revert de la PR puis redéploiement. Aucune donnée à migrer
ou restaurer. Les contrôles automatisés et leurs résultats finaux sont
consignés dans la PR.

## Résultats du 19 octobre 2026

- Lint web : réussi, aucune erreur ; quatre avertissements de navigation
  préexistants hors du périmètre modifié.
- Build web de production et vérification TypeScript : réussis.
- Vérification des sources UTF-8 : réussie ; `git diff --check` réussi.
- Sélection Playwright wizard-polish-600, wizard-responsive et cas preview /
  miniatures de beauty-wheel-polish : 31 tests réussis dans Chromium.
  Couverture 320 à 1920 px, faible hauteur 600 px et paysage 640×360,
  parcours de création/édition et sauvegarde marchande/administrateur simulée.
- Captures inspectées : choix de jeu 1280×600, aperçu complet 1920×1080,
  collections roue et ticket et champs/actions sur mobile 390×844.
- Comparaison automatique du titre, sous-titre et logo entre l’iframe du
  brouillon et le rendu mobile de prévisualisation. Aucune participation,
  publication ou sauvegarde réelle créée par les vérifications.

Il reste à réaliser la validation propriétaire sur le déploiement de PR avant
tout merge ou déploiement en production.
