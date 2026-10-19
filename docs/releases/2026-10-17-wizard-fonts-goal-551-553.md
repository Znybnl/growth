# Wizard : objectif masqué et polices Beauté — #551 / #553

## Demande et analyse

Le propriétaire demande de masquer Objectif en conservant « Obtenir des avis »
comme choix caché et de traiter l'ouverture des polices Beauté (#551).
Le nouveau brouillon utilisait déjà `review_prompt` ; le contrôle visible est
retiré et la description d'étape adaptée. Les jeux existants gardent leurs
réglages, notamment objectif social/contacts, actions et collecte d'e-mail.
Il ne s'agit pas d'une conversion historique ou d'une obligation de publier
un avis pour jouer. Les actions restent modifiables à leur étape dédiée.

Les familles Playfair Display, Cormorant Garamond et Bodoni Moda étaient déjà
chargées par next/font et acceptées par le serveur. Seules les listes de choix
des roues étaient restreintes. Leur union dédoublonnée propose les trois familles
en plus des polices déjà offertes ; les défauts de chaque modèle sont préservés.
Les tickets disposaient déjà de ces familles : leur rendu est revérifié.

L'éditeur utilisait aussi cette liste pour le titre de l'affiche. Un contexte
`poster` conserve exactement la liste antérieure, afin de ne pas élargir un
export qui possède son propre support de polices. Aucun changement au moteur
d'affiche, aux modèles, fonds, couleurs, espacements ou aux polices de lisibilité
des segments/JOUER.

## Frontières et sécurité

Aucune migration, dépendance ou police ajoutée. Aucun changement de permissions,
de tirage, d'envoi, de collecte, de PIN ou de stockage métier. Le masque est du
JSX retiré, pas un simple `display:none` laissant un contrôle au clavier.
Le défaut existe dans l'état de création ; les données d'édition sont conservées.

La fixture développement existante est enrichie de modes synthétiques nouveau
jeu/ancien objectif et d'une police d'exemple validée parmi les trois familles.
Elle reste protégée par `NODE_ENV === development`, sans session ni bypass de
permissions. Les tests interceptent toute API et toute sortie HTTPS avant usage.
La sauvegarde testée est la sérialisation réelle du Wizard, acceptée par une
réponse locale simulée ; la réouverture utilise la valeur sérialisée, pas une
campagne réellement créée en base. Aucun e-mail ni action marketing externe.

## Vérifications

Commandes :

- `npm run lint:web` (quatre avertissements préexistants de navigation interne
  dans inscription/Mon compte/établissements ; aucun de ces fichiers modifié).
- `npm run build:web`.
- `npm run verify:source`.
- `npm run test:wizard-marketing-actions -w @okado/web-app`.
- Serveur dédié `npm run dev -w @okado/web-app -- --port 3331 --webpack`, puis
  `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3331 npm run test:e2e -w @okado/web-app -- e2e/wizard-options-551-553.spec.ts e2e/beauty-wheel-themes.spec.ts`.

Résultats du 17 octobre 2026 : build et TypeScript réussis ; lint sans erreur
(quatre avertissements préexistants indiqués ci-dessus) ; vérification UTF-8
réussie ; 4 tests des actions marketing réussis ; 18 tests Playwright réussis.
Les sélecteurs sont exercés sur les six roues Beauté, Éclat et les cinq tickets
Beauté, dans le Wizard et l'éditeur. Les rendus intégré/prévisualisation/public
sont vérifiés à 320 et 1280 px, y compris la famille CSS calculée, les accents,
retours à la ligne, débordements horizontaux et erreurs JavaScript.
Le build de production lancé localement sur le port 3332 répond bien HTTP 404
pour la fixture de test. Les deux serveurs dédiés ont été arrêtés après contrôle.

Captures locales synthétiques inspectées visuellement (pas des données client) :

- [Wizard mobile sans objectif](../design/wizard-options-551-553/wizard-new-320.png).
- [Wizard desktop sans objectif](../design/wizard-options-551-553/wizard-new-1280.png).
- [Playfair mobile](../design/wizard-options-551-553/beauty-botanical-playfair-320.png).
- [Cormorant mobile](../design/wizard-options-551-553/beauty-botanical-cormorant-320.png).
- [Bodoni mobile](../design/wizard-options-551-553/beauty-botanical-bodoni-320.png).

Les trois variantes restent lisibles et distinctes, sans texte tronqué sur le
cas testé. Les anciens contrôles « Objectif » et leur aide sont absents, sans
trou dans la mise en page. Ces tests ne remplacent pas la validation propriétaire
et ne prétendent pas prouver un déploiement ou une sauvegarde réelle en base.

## Recette propriétaire

1. Nouveau jeu : continuer vers La promesse ; aucun objectif visible, collecte
   e-mail toujours disponible ; sauvegarder sans URL Google, aucune action inventée.
2. Ancien jeu social : modifier le nom et sauvegarder ; actions et collecte conservées.
3. Sur chaque roue Beauté : choisir Playfair, Cormorant puis Bodoni ; vérifier le
   rendu intégré, enregistrer, rouvrir et prévisualiser. Même choix dans l'éditeur.
4. Vérifier un ticket Beauté et les accents/retours à la ligne sur mobile.
5. Les polices initiales, fonds, palettes, tailles et options d'affiche restent inchangés.

## Livraison et retour arrière

PR dédiée pour validation propriétaire avant fusion/production. Aucun accès ou
changement en production pendant le développement. Retour arrière : revert du
commit ou précédent déploiement SaaS, sans migration ni donnée à restaurer.
Les modifications locales des autres tâches sont préservées et exclues.
