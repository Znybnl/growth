# Tickets à gratter Noël — #676, PR #675

## Résultat et périmètre

Les ambiances Noël rose poudré, naturel et traditionnel rouge/vert de #674
existent aussi en tickets à gratter, pour tous les secteurs, dans le wizard et
l'éditeur classique. Les miniatures représentent les vrais décors et une zone
ronde nacrée, champagne ou dorée. Le titre d'une nouvelle campagne à gratter
conserve le réglage partagé de 46 px. Le logo, le titre, le sous-titre, la police
et les espacements restent modifiables. Les réglages mémorisés par modèle sont
réutilisés, sans changer le modèle par défaut d'une activité.

## Réutilisation et impacts

- Les trois décors WebP déjà livrés avec les roues sont réutilisés et restent
  disponibles dans la bibliothèque Noël. Aucun asset supplémentaire à télécharger.
- Le décor natif est résolu lors du rendu ; aucune image native n'est enregistrée
  dans le champ d'image marchand partagé entre modèles. Un fond manuel est prioritaire.
- Les textures métalliques d'origine Lilas, Botanique et Noir & Or sont chargées
  dans le canvas existant. Le revêtement reste opaque ; aucun faux grattage ni
  texture de secours supplémentaire ne remplace le mécanisme existant.
- La palette de la zone à gratter reste fixe, comme pour les autres tickets
  texturés. Les contrôles de couleur sans effet sont masqués.
- L'aperçu intégré utilise le même ticket, dans le repère mobile canonique,
  sans permettre de gratter. La nouvelle géométrie est réservée aux trois modèles
  Noël ; les tickets existants conservent leurs dimensions et leur typographie.
- Le moteur de tirage, les probabilités, les stocks, le retrait, les actions,
  les participations, les e-mails, les permissions et le consentement restent
  inchangés. Aucune migration SQL ni écriture de données de production.

## Vérifications

Commandes depuis la racine, sauf Playwright depuis `apps/web-app` :

```text
npm run test:christmas-scratch -w @okado/web-app
npm run test:christmas-wheels -w @okado/web-app
npm run lint:web
npm run build:web
npm run verify:source
npx playwright test e2e/christmas-scratch.spec.ts --workers=1
npx playwright test --config playwright.christmas.config.ts e2e/christmas-scratch.spec.ts --project=webkit --grep-invert @visual-1280
```

Six tests Node des tickets et sept tests Node des roues réussis. Treize tests
Chromium des tickets et onze tests WebKit/iPhone 13 réussis : mobile 320/390 px,
chargement réel des textures, pixels opaques, grattage souris/tactile avec un seul
démarrage et une seule révélation, logo image, fond manuel prioritaire et aperçu
non interactif. Contrôles des deux éditeurs à 1280×720 et du wizard à 1280×600.
Le rendu des trois pages mobiles et de l'aperçu intégré a été inspecté visuellement.

Le lint passe avec zéro erreur et les quatre avertissements préexistants de
navigation interne. Build Next.js et TypeScript réussis ; scan UTF-8 réussi.
Les tests mobiles et les tests visuels 1280 px sont intégrés à la CI existante.
La configuration WebKit reste disponible pour la recette locale.

Une passe complémentaire de 26 tests Chromium a validé les nouveaux tickets,
les roues Noël (dont leurs rotations) et les revêtements/phrases masquées des
anciens tickets. Les deux contrôles 1280 px ont ensuite été rejoués : aucun
avertissement de position ou de hauteur nulle des images dans l'iframe.
Le smoke de la version compilée passe 14 contrôles : six décors/miniatures,
trois URL Next/Image, trois textures d'origine et deux fixtures renvoyant 404.

Captures et contrôles complémentaires : `.codex-logs/christmas-676/` et
`apps/web-app/test-results/christmas-final/`. Les fixtures utilisent uniquement
des données locales et interceptent les appels API ; elles renvoient 404 dans
la version compilée de production.

## Recette propriétaire et retour arrière

Créer un ticket à gratter, sélectionner successivement les trois modèles Noël,
modifier logo/texte/police/espacements, choisir un fond de bibliothèque puis une
image importée, changer de modèle et revenir. Vérifier l'aperçu et le grattage
en mode de test. Les choix existants des autres campagnes restent inchangés.

La PR reste en attente de validation, sans merge ni déploiement. En cas de retrait,
revenir au commit précédent ; si des campagnes utilisent déjà ces identifiants,
les faire passer sur un modèle existant avant de retirer leur prise en charge.
