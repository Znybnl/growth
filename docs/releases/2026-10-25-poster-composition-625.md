# Affiches Botanique / Élégance — #625

## Complément propriétaire — Classique et Botanique

Demande du 25 octobre 2026, intégrée à la même PR :

- Classique : texte principal à40px par défaut (création, choix du modèle,
  paramètres absents dans l’éditeur et export). Une taille déjà enregistrée,
  y compris42px, reste explicite et n’est pas écrasée.
- Classique : « SCANNEZ POUR JOUER » en majuscules ; position verticale du
  bandeau838→824, soit16,6unités après le cadre QR au lieu de30,6, sans toucher
  au QR ni à sa zone de silence. Roue716→728 (+12vers le bas). La miniature
  bénéficie des mêmes changements grâce au renderer partagé.
- Botanique : espace titre/sous-titre augmenté de8unités (minimum30→38) ;
  corps secondaire24→22. Largeur360 et géométrie QR précédente conservées.
- Élégance et Botanique éditorial ne reçoivent aucun ajustement supplémentaire.
- Tests : composition6scénarios, valeurs initiales4 ; E2E étendu à6variantes
  (Classique/Botanique/Élégance × roue/ticket), export identique à l’aperçu,
  QR de Botanique et Classique vérifiés module par module aux tailles A4/A5.
  Captures1280×720/600 et390px inspectées ; tests6/6+4/4+6/6, contrôles
  source, lint (4avertissements préexistants hors périmètre) et build réussis.

Ce complément remplace seulement la conservation du corps secondaire Botanique
annoncée dans l’analyse initiale ci-dessous, conformément au retour propriétaire.

## Rendu et cause

Contrôle avant correction dans le vrai éditeur : le texte secondaire Botanique
utilisait 548 unités de largeur et s’approchait du feuillage. Élégance limitait
sa colonne à la largeur du QR (270 unités), indépendamment des réglages de
largeur du modèle. Les deux colonnes utilisent désormais 360 unités sur le
plan SVG794×1123 : plus étroit pour Botanique, plus large pour Élégance.
Polices, corps, encres, contenu, logo et réglages enregistrés conservés.

Le carré blanc Botanique occupait x448/y489, 281×281, et le QR219×219 commençait
à471/512. Son centre était donc décalé de−8 sur chaque axe. Il commence désormais
à479/520, avec31unités égales sur les quatre côtés. Le bandeau chevauchait aussi
le bas du carré : il commence maintenant18unités sous le cadre (y788), sans
masquer la marge blanche. Libellé et identité du bandeau conservés.

Le calcul de géométrie est partagé avec la miniature Botanique, qui utilisait
ses propres tailles et un QR verticalement décentré. Aucun autre QR ou template
de miniature modifié. Botanique éditorial est un modèle distinct, hors périmètre.

La colonne Botanique plus étroite conserve les phrases longues en autorisant
leur retour automatique sur davantage de lignes visuelles, plutôt que couper
le texte à l’ancienne limite de trois lignes rendues. Le texte source et ses
trois paragraphes maximum ne sont pas modifiés. Cette colonne reste à gauche
du cadre QR ; aucun étirement des glyphes ou changement de taille appliqué.

## Vérification

- Régression reproduite avant correction : largeur548 observée dans l’éditeur
  et capture PNG de référence inspectée ; le test attend360 et échoue avant patch.
- `npm run test:poster-composition -w @okado/web-app` :4/4, dont12combinaisons
  de modèle/jeu/logo, textes courts/longs/multiligne, absence/désactivation,
  non-mutation, marges exactes, SVG et Botanique éditorial inchangé.
- `npm run test:poster-defaults -w @okado/web-app` :3/3.
- `poster-composition-625.spec.ts` :4/4, vrai éditeur et deux modèles ×deuxjeux,
  miniatures, fichier794×1123 et téléchargement identique à l’aperçu.
  Chaque module du QR est comparé à l’encodage attendu de l’URL publique,
  à la résolution native puis réduite à562px de largeur pour le format A5.
  Ce contrôle numérique ne remplace pas une impression et un scan smartphone.
- Captures d’œuvres finales et écrans1280×600/390px inspectées ; contrôles
  de débordement conservés. Captures1280×720 également réalisées lors de la
  dernière relance4/4 réussie (31s). ESLint ciblé des tests réussi.
- Lint sans erreur (4avertissements anciens), build/TypeScript et source vérifiés.
  Aucun accès métier de production ni e-mail : API interceptées, données fictives.

Relecture React : géométrie pure dérivée des props, aucun effet/state ajouté,
pas de requête ni dépendance nouvelle, boutons et accessibilité inchangés.
Frontend-design a guidé le calibrage des colonnes et l’équilibre cadre/bandeau.

## Recette et livraison

Ouvrir une affiche Botanique puis Élégance, activer son texte secondaire et
vérifier sa largeur avec vos textes. Contrôler le centrage du QR Botanique et
son bandeau, puis télécharger : le fichier doit correspondre à l’aperçu.
Scanner le QR avec un smartphone sur l’affiche imprimée de test avant diffusion.
Logo texte/image et activation/désactivation restent configurables.

Branche et PR dédiées depuis main. Pas de migration SQL, réécriture de campagne,
changement d’URL du QR, permissions ou traitement métier. Validation propriétaire
avant merge/déploiement ; retour arrière applicatif sans restauration de données.
