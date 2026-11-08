# Wizard mobile — #762

## Résultat utilisateur

La progression du Wizard occupe moins de place sur téléphone. Le titre de la
campagne reste visible, l’étape courante est indiquée par le sélecteur compact et
le titre du formulaire reste lisible. Dans Apparence, quatre liens permettent de
rejoindre directement les templates, couleurs et texte, logo, ou réglages avancés.
L’état du template sélectionné conserve son repère accessible existant.

## Périmètre et risques

- Présentation mobile sous 768 px ; navigation, sauvegarde et données inchangées.
- Le sélecteur ne donne toujours accès qu’aux étapes autorisées existantes.
- Aucun changement au fonctionnement bureau, aux valeurs, aux lots, à la
  publication ou aux sauvegardes.
- Aucun changement de base, migration SQL ou dépendance.
- Retour arrière : revert de la PR liée à #762.

## Vérifications

- E2E Chromium : **19 tests passés** (`wizard-mobile-navigation.spec.ts`,
  `wizard-responsive.spec.ts`, `mobile-ux.spec.ts`). Viewports mobiles 320, 390,
  412 px, tailles bureau incluant 1280×600/720, sauvegarde/aperçu et parcours
  existants.
- `npm run lint -w @okado/web-app` : réussi, 4 avertissements préexistants hors
  périmètre, aucune erreur.
- `npm run build -w @okado/web-app -- --webpack` : réussi. Le build Turbopack
  n'a pas pu résoudre Next.js à travers la junction `node_modules` du worktree ;
  le build Webpack fournit le contrôle de production.
- Données fictives et API interceptées ; aucune écriture métier réelle.
- Captures locales : `apps/web-app/test-results/issue-762-final2/`.

Les résultats et captures inspectées seront ajoutés après exécution des contrôles.
