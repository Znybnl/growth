# Tickets festifs sans thème saisonnier — #724

## Correction

Les quatre modèles issus de cette issue sont des univers de fête et de cadeaux,
pas des modèles de Noël. Les noms visibles sont désormais **Vert bouteille &
rubans**, **Ivoire & champagne**, **Rayons rétro** et **Satin noir & or**. Les
identifiants internes historiques `scratch-christmas-*` sont conservés pour ne
pas invalider les campagnes existantes.

Les décors ont été recréés à partir des références :

- vert bouteille et champ ivoire, rubans rouges/verts et paquets dans les coins ;
- fond ivoire avec larges rubans dorés et paquet clair en bas à droite ;
- rayons rétro turquoise, corail, safran et crème ;
- fond noir mat encadré de rubans dorés satinés et de paillettes fines.

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

Les fichiers WebP gardent les chemins historiques pour éviter les références
cassées. Les noms visibles dans le produit et dans la bibliothèque ne mentionnent
plus Noël pour ces quatre modèles.
