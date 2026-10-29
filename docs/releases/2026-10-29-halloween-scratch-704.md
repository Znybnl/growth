# Halloween doré en ticket à gratter — #704

Nouveau template `scratch-halloween-gold`, distinct de la roue. Il est accepté
par le parseur de campagne, proposé à tous les secteurs dans les deux éditeurs
et rendu par le ticket immersif existant. Un thème commun définit les valeurs
initiales et la palette fixe ; aucun réglage d’un autre template n’est réécrit.

Décor, texture de la pastille et signature Spécial Halloween réutilisent les
WebP livrés dans public/images/templates/halloween-gold, déjà inclus par
.vercelignore. Titre doré en dégradé, logo texte blanc, police initiale Bodoni,
taille habituelle des tickets et pastille ronde dorée. Le logo image reste
intact. Les textes, leur police, tailles et espacements sont personnalisables.
Un fond manuel mémorisé pour un autre modèle ne remplace pas le décor fixe.

Les aperçus et miniatures saisonniers partagés remplacent les composants nommés
uniquement Noël. Les trois tickets Noël conservent leurs valeurs et leur
priorité aux fonds manuels. Pas de nouveau moteur : mêmes canevas, contrôle de
texture, seuil de grattage, événement de début et callback de révélation unique.
Tirage, probabilités, stocks et persistance existants inchangés.

## Dépendance et vérification

Ce travail repose sur la branche de #703 pour conserver la hauteur correcte du
vrai aperçu iframe. Fusionner #703 dans main en premier puis recibler cette PR
sur main. Aucun déploiement autorisé dans cette demande.

Tests unitaires : parseur/texte/lot et probabilité conservés sans mutation,
palette fixe malgré une ancienne couleur bleue, distinction du catalogue Beauté,
assets présents et inclus dans Vercel. CI : commande test:halloween-scratch et
scénarios navigateur visuels, grattage et sauvegarde intégrés au workflow.

Recette navigateur : page publique et iframe à 1280×720, 1280×600 et 390×844,
texture opaque, vrai geste et révélation unique, logo image/texte personnalisés,
sélection dans les deux éditeurs, sauvegarde du template/police/logo. API
interceptées : aucune partie, sauvegarde, image importée ou e-mail réel.

Non-régressions : tickets Noël, couverture de leur iframe et roue Halloween.
Deux anciens contrôles de roue ont été adaptés : contrôle réel du champ de
palette au lieu d’une comparaison du source JSX, et comparaison scrollWidth à
clientWidth plutôt qu’à une largeur visuelle réduite par transform:scale.
Ces corrections d’oracle ne modifient pas le rendu de la roue.

Vérifications : 8/8 scénarios Halloween navigateur après le dernier correctif,
10/10 tests unitaires (Halloween, Noël et inventaire des routes analytics).
La suite de non-régression a validé 42 scénarios ; les 7 anciens contrôles de
roue corrigés ont ensuite tous réussi lors de leur relance ciblée.
`npm run build:web` réussi ; `npm run lint:web` : aucune erreur, quatre
avertissements préexistants hors périmètre. Workflow YAML et `git diff --check`
valides. Captures contrôlées à 1280×720, 1280×600 et 390×844.

Aucune migration SQL ni dépendance
ajoutée. Avant utilisation, retour arrière par revert ; si des jeux utilisent
déjà ce template, masquer son entrée tout en conservant son parseur/rendu.
