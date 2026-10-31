# Tickets festifs sans thème saisonnier — #724

## Correction

Les quatre modèles issus de cette issue sont des univers de fête et de cadeaux,
pas des modèles de Noël. Les noms visibles sont désormais **Vert bouteille &
rubans**, **Ivoire & champagne**, **Rayons rétro** et **Satin noir & or**. Les
identifiants internes historiques `scratch-christmas-*` sont conservés pour ne
pas invalider les campagnes existantes.

Les quatre références ont été reprises une par une, puis contrôlées dans l’aperçu du jeu :

- **Vert bouteille & rubans** : aplat vert courbe en tête, champ ivoire, ruban rouge et cadeaux regroupés en bas ; surface kraft agrandie et sans stries métalliques.
- **Ivoire & champagne** : papier ivoire, rubans dorés limités aux coins, paquet réduit en bas à droite et zone kraft ; titre Playfair et sous-titre en casse de phrase.
- **Rayons rétro** : rayons turquoise, corail, safran et crème ; ticket rouge festonné avec étoiles et surface argentée brossée.
- **Satin noir & or** : grand espace noir, éclats dorés concentrés sur les côtés, boucles de satin aux coins et surface de grattage dorée.

Les éléments propres à Noël (branches de sapin, boules, feuillage et cadeaux
de saison) ont été retirés. Les quatre décors sont également accessibles dans
la bibliothèque sous **Fête**. Les noms, le logo et le masque interactif restent
des éléments rendus par l’application, et le choix d’un fond utilisateur reste
prioritaire.

## Impacts et vérifications

Aucune donnée de campagne, règle de grattage, chance, stock ou résultat n'est
modifié. Les rendus et les contrôles des fonds manuels restent inchangés.

Les tests de configuration, de compatibilité des identifiants et de remplacement
du fond passent. Playwright passe 25/25 scénarios, dont les quatre styles sur
écrans mobiles 320/390 px et les deux contrôles visuels éditeur/aperçu à
1280×720 et 1280×600. Les quatre aperçus ont été inspectés visuellement. Le lint
passe sans erreur (quatre avertissements préexistants hors périmètre), le build
Next.js et `verify:source` passent.

Les identifiants des campagnes restent inchangés ; les fonds révisés utilisent
des fichiers WebP dédiés, et les anciens fichiers ne sont pas supprimés. Les noms
visibles dans le produit et dans la bibliothèque ne mentionnent plus Noël pour
ces quatre modèles.
