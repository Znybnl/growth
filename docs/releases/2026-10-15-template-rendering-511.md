# Corrections d'affichage des templates — #511

## Périmètre approuvé

Quatre corrections d'affichage : fond Bicolore lié à la couleur principale,
sauts de ligne de la promesse Dynamique/Signature, suppression de l'aide sous
les tickets à gratter et correction du bleu hérité sur Cadeau lilas.

## Causes et correctifs

- Bicolore initialisait son fond depuis le jaune secondaire et utilisait le
  décor de Moderne. Le résolveur commun utilise désormais la couleur
  principale. Les deux éditeurs suivent ses changements pour un fond standard.
  La miniature reprend le fond principal. L'aperçu intégré, le jeu et la prévisualisation publique résolvent également
  les anciens fonds standard. Un fond manuel distinct ou une image reste
  prioritaire ; le décor de Moderne n'est pas modifié.
- Le composant typographique partagé affichait une seule chaîne avec
  `white-space: normal` pour Dynamique/Signature. `pre-line` conserve maintenant
  les retours saisis, sans modifier le découpage automatique de Bicolore/Moderne.
- Le paragraphe d'aide sous la zone à gratter est retiré du composant partagé,
  pour les neuf modèles visibles et les deux modèles historiques masqués.
- La couleur historique `#003cb4` manquait dans les défauts hérités reconnus
  pour Cadeau lilas. Elle est remplacée à la lecture par `#210b32`, dans les
  contrôles et dans les rendus. Les autres personnalisations sont conservées.
  Limite : un ancien bleu exactement égal à `#003cb4` est indiscernable d'un
  défaut hérité et reçoit ce traitement, comme les anciennes encres déjà
  normalisées par le produit. Aucun réglage des autres modèles n'est remplacé.
  Le sous-titre Cadeau lilas utilise bien la même couleur que le logo, comme
  annoncé par le sélecteur, indépendamment de la couleur du titre principal.

## Vérifications

`e2e/template-rendering-511.spec.ts` utilise les composants réels avec données
synthétiques, sans session privilégiée. Les appels API sont interceptés ;
aucun lot, contact, stock ou e-mail réel n'est créé ou modifié.

- Trois rendus : aperçu intégré, jeu public et prévisualisation publique.
- Sauts de ligne mesurés dans le DOM à 320, 390 et 1280 px.
- Fond Bicolore standard, couleur manuelle, image et changement de primaire
  dans le wizard et l'éditeur classique.
- Neuf tickets visibles : absence d'aide sous le grattage et présence du canvas.
- Ancienne encre bleue, changement de modèle et restauration de l'encre
  personnalisée Cadeau lilas dans les deux éditeurs.
- Les tests existants de fond et de tickets sont adaptés au nouveau contrat.
- Fixture `/dev/template-rendering-proof` limitée au développement, avec 404
  en production ; elle ne fournit aucune authentification ni accès base.

Résultats locaux : 30 tests Chromium ciblés réussis, compilation
`npm run build:web` réussie, `npm run verify:source` réussi et lint sans erreur
(quatre avertissements préexistants hors périmètre). La compilation est exécutée
séparément du serveur de test pour éviter les écritures concurrentes de types
Next.js générés. Les captures Bicolore attendent la présence effective de la roue.
La recette utilise des données synthétiques ; ce n'est pas une vérification
d'une campagne réelle ni une preuve de déploiement.

## Recette propriétaire et retour arrière

Sur la PR : sélectionner Bicolore, modifier sa primaire puis essayer un fond
manuel ; saisir une promesse sur deux lignes pour Dynamique et Signature ;
ouvrir les tickets puis alterner Cadeau lilas/Corail après personnalisation.
Vérifier l'aperçu et la prévisualisation mobile.

Aucune migration ni configuration de production nécessaire. Le retour arrière
consiste à annuler le commit applicatif. Ne pas réécrire les campagnes en base.
Merge et déploiement uniquement après validation du propriétaire.
