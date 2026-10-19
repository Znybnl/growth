# Affiche Élegance par défaut pour Beauté — #597

Le défaut d’une nouvelle campagne est produit par `createDefaultPosterSettings`,
commun au Wizard, à l’éditeur classique et à la création administrative. Ce helper
utilise maintenant le preset complet Élegance (`premium-wheel`) pour Beauté :
fond ivoire, Cormorant, texte sombre et roue beige/or. Les autres secteurs
conservent le template canonique Classique (`classic-wheel`) et leur couleur.

Le choix est enregistré dans les réglages d’affiche ordinaires et relu par les
mêmes parcours serveur. La normalisation des campagnes existantes conserve leur
template enregistré. Les campagnes dont Classique a déjà été initialisé ne sont
pas réinterprétées comme des affiches neuves ; aucune migration ni écriture de
masse. Le template de la page de jeu n’est pas modifié.

## Vérifications

- `test:poster-defaults` : trois tests du preset complet, du défaut des autres
  secteurs et de la conservation de Classique/texte personnalisé.
- `e2e/poster-defaults.spec.ts` : créations roue et ticket, marchand et admin,
  vérification du véritable POST ; sélection/rendu Élegance à 1280×720,
  1280×600 et 390 px ; choix explicite de Classique transmis à la sauvegarde.
- Fixtures avec le vrai MerchantShell, données fictives et API interceptées.
  Aucun jeu réel créé ni publié. La fixture reste interdite en production.
- Les tests visuels sont tagués `@visual-1280` pour le job CI et les captures.
  Les imports purement de types de trois modules sont déclarés `import type`
  pour exécuter les helpers réels sous le runner Node, sans changer leur comportement.
- Lint sans erreur (4 avertissements de navigation préexistants), build
  Next 16.3.8/TypeScript, contrôle UTF-8 et diff-check.

## Validation et retour arrière

Créer un brouillon Beauté dans le Wizard puis ouvrir son affiche : Élegance doit
être sélectionné. Faire de même depuis Pilotage. Un ancien jeu explicitement
Classique et un nouveau jeu hors Beauté doivent garder Classique. Choisir un autre
template puis sauvegarder doit rester possible. Revert de la PR pour revenir au
défaut précédent ; les affiches déjà sauvegardées gardent leur choix.
