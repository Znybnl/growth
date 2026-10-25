# Confirmation d’enregistrement — #577

## Résultat utilisateur

La confirmation affiche une seule action principale « Prévisualiser mon jeu »,
le QR réel de participation et son téléchargement SVG directement sous l’image.
L’affiche reste un lien discret. Le texte « Testez le parcours… », le bouton
« Continuer la configuration » et l’accès redondant au QR de test disparaissent
de cette confirmation. Le QR de test reste disponible dans la barre du Wizard.

L’état enregistré distingue « Jeu publié » et « Brouillon enregistré », y compris
pour le marchand. Un brouillon précise que son QR donnera accès au jeu après
publication ; l’export reste autorisé et ne publie rien. L’administrateur conserve
le nom de l’établissement destinataire.

Le lancement demandé de #577 autorise cette simplification, pas l’option
complémentaire consistant à supprimer la confirmation lors des sauvegardes
suivantes : sa fréquence est inchangée.

## Périmètre et risques

- Composants : confirmation, panneau QR partagé avec le dialogue de téléchargement,
  suppression du callback QR de test devenu inutile et fixture de développement.
- Réutilisation du même chargement inline, de la même image SVG enregistrable par
  clic droit, des mêmes tâches annulables et du même téléchargement explicite.
- L’aperçu est toujours celui de la version enregistrée, via les endpoints de test
  marchand/admin existants. Une seule popin à la fois ; pas de participation réelle.
- Aucune migration, écriture implicite, publication automatique, modification
  de permissions, lots, stocks, e-mails ou indicateurs de jeu.
- Aucune modification de route : les routes existantes distinguent déjà inline
  et téléchargement. Les nouveaux tests verrouillent cette non-régression.
- Risque principal : extraction du code QR partagé ; sa suite navigateur et les
  handlers réels sont rejoués, y compris refus, reprise, fermeture et téléchargement.

## Vérifications

- `npm run build -w @okado/web-app` : réussi, compilation, TypeScript et
  génération des pages. `npm run verify:source` et `git diff --check` : réussis.

- `npm run lint -w @okado/web-app` : aucune erreur ; quatre warnings préexistants
  de navigation interne dans trois composants hors périmètre.
- `node --experimental-strip-types --test apps/web-app/src/lib/preview-qr.test.mjs` :
  7 tests, vrai handler et vrai renderer, infrastructures simulées.
- `npm run test:admin-campaigns -w @okado/web-app` : 40 tests.
- Depuis `apps/web-app` :
  `npx playwright test e2e/game-ready-577.spec.ts e2e/admin-campaign-qr.spec.ts --reporter=line`.
  17 nouveaux scénarios : marchand/admin, roue/ticket, création/édition/jeu
  déjà publié, SVG affiché = SVG téléchargé, chargement/erreur/reprise,
  double clic, fermeture lente, focus/Escape et ouverture de l’aperçu isolé.
  Les 16 tests existants de téléchargement QR/CSV/affiche sont aussi rejoués.
- Captures dans les résultats Playwright, inspectées : confirmation publiée et
  brouillon, marchand/admin, état d’erreur ; 1280×720, 1280×600, 1366×768,
  390×844 et 320×844. Vrai cadre MerchantShell, pas de scroll interne aux tailles
  testées, actions visibles. Les hauteurs encore plus petites gardent un seul
  conteneur de défilement dans la popin.
- Données fictives uniquement, API navigateur interceptées, appels HTTPS bloqués :
  aucun compte, scan, gain, stock ou événement analytique de production modifié.
- Revue React : pas d’état miroir pour le statut, pas de seconde fenêtre,
  chargement QR uniquement lorsque la confirmation est ouverte, tâches annulées
  à la fermeture et URL blob révoquée.
- Le contrôle clavier a détecté un retour de focus perdu après confirmation →
  aperçu : correction locale au Wizard, retour au bouton stable d’enregistrement
  après démontage de la popin. Les douze variantes de sauvegarde le vérifient.

## Recette propriétaire

1. Enregistrer un brouillon : statut fidèle, QR visible, télécharger et scanner
   le SVG ; il doit viser le lien de diffusion sans rendre le brouillon public.
2. Prévisualiser : ouverture du jeu isolé, fermer et retrouver le Wizard.
3. Enregistrer un jeu publié : statut publié et QR du même jeu.
4. Depuis Pilotage, répéter pour un marchand ; vérifier l’établissement affiché.
5. Vérifier roue et ticket, petite fenêtre d’ordinateur et téléphone.

Le rendu à l’écran et la destination encodée sont contrôlés automatiquement ;
le scan optique sur un vrai téléphone reste une recette propriétaire.

## Livraison / retour arrière

PR dédiée en attente de validation propriétaire. Aucun merge/déploiement autorisé
par cette demande. Retour arrière : revert du commit de la PR ; pas de données
ou schéma à restaurer.
