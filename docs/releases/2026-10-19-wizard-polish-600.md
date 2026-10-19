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

## Retours propriétaire — deuxième itération

- Hauteur utile mobile 844 → 740 px, partagée par le brouillon et la
  prévisualisation interactive. Il s’agit d’une hypothèse de présentation
  intégrant la place du navigateur, pas d’une contrainte sur les téléphones.
  Cadre 414×764, affichage maximal 260 px de large (environ 480 px de haut).
- Progression verticale 220 → 250 px sur grand écran. Les autres formats
  conservent leur progression horizontale/sélection, pour ne pas rétrécir le
  formulaire sur 1280 px.
- Aucun changement précédent du sous-titre public : l’ancien aperçu le
  grossissait avec le viewport ordinateur. Ajout demandé de 2 px dans les
  styles partagés, y compris les variantes Beauté et Halloween.
- Miniatures Éclat : palettes des constantes produit (rose, blanc rosé et bleu
  texte), y compris dans la liste hors Beauté précédemment dessinée en bleu.
  Aucun changement de palette ou finition de la roue réellement jouée.
- Moderne : huit secteurs bleu/blanc, cadeaux, anneau bleu, pointeur arrondi
  blanc/bleu et centre avec pictogramme main. SVG statique avec icônes Lucide,
  sans bouton imbriqué ni interaction de jeu.
- Accroches des miniatures plus grandes et courtes (« Jouez & gagnez » ou
  « Grattez & gagnez »), sous-titres plus longs. Les données du jeu du marchand
  ne sont jamais remplacées par ces exemples de galerie.

Recette : comparer les collections à 1280 px et grand écran, vérifier les
couleurs Éclat/Moderne puis la taille du téléphone et du sous-titre ; ouvrir la
prévisualisation et vérifier le même viewport utile. Contrôles à relancer sur
cette itération : série Chromium, lint web et build web.

Résultats : 32 tests Chromium réussis, puis trois tests de galerie et deux
tests ciblés relancés avec succès après ajustement visuel des colonnes de texte
pour éviter leur chevauchement avec les roues. Captures 1280 px, 1920 px et
390 px inspectées. Vérification des sources réussie. Les sous-titres sont
comparés au rendu public à 390×740 et contrôlés à leur ancienne taille +2 px.
Lint web réussi (aucune erreur, quatre avertissements préexistants hors
périmètre) et build de production réussi avec vérification TypeScript.
