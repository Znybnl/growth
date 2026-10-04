# Roue Halloween dorée — issue #456

## Référence et rendu

La référence est « Affiche Halloween dorée et raffinée.png », fournie par le propriétaire. L’image n’est pas utilisée comme une page de jeu aplatie : le logo, le titre et la vraie roue restent des éléments séparés et interactifs.

| Référence fournie | Première version proposée | Version affinée à 390 px |
| --- | --- | --- |
| ![Référence](halloween-wheel-456-reference.webp) | ![Avant](halloween-wheel-456-final.webp) | ![Après](halloween-wheel-456-refined.webp) |

### Itérations réalisées

1. Décor généré et cadre métallique transparent, roue interactive à six secteurs. Écarts relevés : pictogrammes filaires trop génériques, titre trop bas et écriture saisonnière trop différente.
2. Pictogrammes pleins/à reflets générés depuis la référence ; marge compacte du logo isolée par modèle ; titre remonté et légèrement espacé ; masque agrandi.
3. Mention saisonnière calligraphique générée comme asset fixe, sans nouvelle police à télécharger ; ajustement du dégagement avant la roue. Coordonnées SVG arrondies pour éviter une différence d’hydratation Node/Chromium.
4. Nouvelle comparaison à taille identique : la première évaluation « 9/10 » était optimiste, plutôt 8,5/10 après examen de la roue trop grande et trop basse. Largeur de la roue ramenée de 87 % à 82 % ; espacement initial Halloween de 38 à 32 px, sans remplacer une valeur enregistrée. Centre de roue autour de Y=405 px à 390 px, proche de la référence.
5. Dorure radiale ambrée avec microtexture raster à 12 % d’opacité ; deux essais de calligraphie supplémentaires. Le premier conservait trop de halo et n’a pas été retenu ; `wordmark-v3.webp` utilise des traits fins avec une très légère lueur ajoutée en CSS. Reflets ponctuels du titre et anneau du centre affinés, sans pictogramme dans JOUER.
6. Cadre régénéré avec rails moins épais et fleur-de-lis plus compacte ; alignement du cercle de métal sur le disque ; dernier ajustement de la palette pour retrouver l’or cuivré plutôt qu’un jaune crème. Capture finale contrôlée sur l’aperçu et la page de jeu réelle, puis 21 contrôles navigateur réussis.

### Correspondance estimée, non métrique automatique

| Axe | Autoévaluation | Écart résiduel |
| --- | --- | --- |
| Fond et ambiance | 9,5/10 | Les fleurs et feuillages sont régénérés, pas une copie pixel à pixel. |
| Composition et proportions | 9–9,5/10 | Centre et diamètre rapprochés de la cible ; le titre s’adapte au contenu réel du marchand et peut allonger la page. |
| Roue et dorures | 9/10 | Volutes du cadre et facettes légèrement différentes, même traitement noir/or brillant. |
| Typographie et pictogrammes | 9/10 | Bodoni reste une police disponible, pas le dessin exact des lettres de la référence ; les pictogrammes gardent leurs propres facettes. |
| Fidélité globale | **Environ 9/10** | Appréciation visuelle à confirmer par Pierre-Henri, pas une mesure de similarité objective. |

Différence intentionnelle demandée : aucun cœur ni autre icône dans le bouton JOUER. Le petit cœur entre les filets sous le logo appartient au décor du header, pas au bouton.

## Assets et provenance

Génération : outil intégré `imagegen`, édition guidée par la référence, transparence activée uniquement pour le cadre, les pictogrammes et le mot-symbole. Les originaux générés sont conservés hors dépôt ; les exports WebP de production sont dans `apps/web-app/public/images/templates/halloween-gold/`.

- `background.webp` : 941 × 1672, 181 874 octets. Sans texte, logo, roue ou bouton : seulement le décor photographique périphérique.
- `frame-v2.webp` : 1254 × 1254 avec alpha, 203 184 octets. Trois filets métalliques plus fins, volutes et fleur-de-lis. La première version reste conservée, mais n’est plus chargée par le template.
- Six pictogrammes avec alpha, dimension maximale 256 px : cadeau, masque, citrouille, étoiles, cœur, diamant.
- `wordmark-v3.webp` : 900 × 196 avec alpha, 60 070 octets, inscription fixe « Spécial Halloween ». La première version reste conservée, mais n’est plus chargée par le template.
- `foil.webp` : 640 × 640, 80 150 octets. Microtexture dorée appliquée seulement aux secteurs clairs, faible opacité ; aucun décor CSS ne remplace le fond photographique.
- Recadrage technique, conservation de l’alpha et encodage WebP via Sharp ; aucun original utilisateur n’est modifié.

### Prompts de production reproductibles

**Fond** : portrait 9:16, reprendre le périmètre photographique noir/or de la référence, roses noires à gauche, feuillages métalliques dorés, deux bougies ambrées à gauche, bougies/votives à droite, citrouille lumineuse en bas à gauche, satin noir en bas, toile dorée en haut à droite et chauve-souris dorée sur le bord droit. Retirer tous les textes, logo, filets, cœur, roue, pointeur et ornements de roue. Garder un vaste centre noir libre pour le header et la roue. Aucune interface ni cadre circulaire dans le fond.

**Cadre** : anneau isolé sur alpha réel, face caméra, trois rails fins d’or poli avec reflets ambrés, délicates volutes baroques et fleur-de-lis en bas. Centre et extérieur transparents. Ni roue, ni secteurs, ni pointeur, ni texte, ni fond.

**Atlas** : exactement six pictogrammes, trois colonnes/deux rangées, fond transparent, chaque cellule indépendante. Première rangée : cadeau noir plein avec ruban transparent, masque de bal or métallisé avec yeux transparents et ailes effilées, citrouille noire avec visage découpé. Deuxième rangée : groupe d’éclats à quatre pointes dorés, cœur noir plein, diamant doré à facettes avec trois petits éclats. Reprendre les silhouettes de la roue de référence, pas des icônes génériques filaires. Aucun texte, cadre ou roue.

**Mention** : uniquement « Spécial Halloween », exactement ces mots et cet accent, calligraphie fine et fluide avec longues hampes, dorure ambrée lumineuse très légère, une ligne horizontale, fond alpha propre. Reprendre la mention manuscrite située sous le titre dans la référence. Aucun logo, cœur, roue ou autre décor.

**Mention affinée** : conserver exactement les mots et la composition, retirer toute lueur, ombre, halo orange et centre néon blanc de l’asset ; traits cuivre ambré fins et nets sur alpha, longues hampes H/l, aucune autre inscription. La faible lueur est appliquée séparément dans le rendu.

**Cadre affiné** : conserver le canevas carré, centre et diamètre extérieur du cadre initial ; réduire de moitié environ la bande métallique, agrandir le trou transparent vers 93–94 % du diamètre extérieur ; trois rails fins avec reflets ivoire, intervalles transparents, petites volutes et fleur-de-lis moins haute. Ni pointeur, roue, secteurs, mots ni fond.

**Microtexture** : photo macro carrée d’une surface métallique champagne/or ambré, grain brossé très fin et léger relief de feuille d’or, lumière uniforme, sans objet, motif, texte, vignettage, gros rayures ou glitter. Original généré conservé hors dépôt ; réduction technique et WebP via Sharp.

## Limites et non-régressions

- Les pictogrammes sont décoratifs. Les identifiants et libellés des vrais résultats sont conservés, notamment dans la liste accessible des secteurs.
- Le rendu s’étend à un nombre pair de secteurs si six ne suffisent pas à représenter tous les résultats distincts. Aucun lot configuré ne doit disparaître pour respecter l’illustration.
- Aucun changement aux probabilités, endpoints, tirage, stock, collecte, e-mail ou retrait ; tests de session/jeu réalisés sur réponses API simulées, sans écrire en base.
- Pas de migration SQL. La petite propriété facultative `wheelTemplateStyles.*.logoBottomSpacingPx` est enregistrée dans la présentation existante pour restaurer les réglages en quittant Halloween.
- La route `/dev/halloween-proof` utilise uniquement des données fictives ; elle renvoie une page introuvable hors développement. Elle n’est pas une préproduction ni un lien de recette Vercel.
- Le serveur local 3001 n’a pas été remplacé. Le serveur temporaire 3000 sert uniquement aux vérifications et est arrêté après celles-ci.

## Vérifications réalisées

- `npm run lint` : réussi ; quatre avertissements déjà présents, hors de cette évolution.
- `npm run build` : réussi, compilation et contrôle TypeScript inclus.
- Tests unitaires de représentation des lots : 3 réussis.
- Playwright Halloween et non-régression des fonds : 21 réussis après affinage, dont un contrôle géométrique du diamètre, de la position du centre et des nouveaux assets à 390 px.
- Build production : fixture HTTP 404, fond WebP HTTP 200 (181 874 octets), connexion accessible sans erreur navigateur dans une session neuve.
- Serveur temporaire arrêté ; serveur 3001 conservé sans changement.

## Validation propriétaire

### Palette du logo — validation du 4 octobre

Le sélecteur « Couleur du logo et sous-titre » affiche un blanc fixe et le badge « Palette fixe » pour Halloween uniquement. Il est désactivé, avec une explication : logo blanc, sous-titre doré. Le rendu impose également le blanc au logo texte lorsqu'une ancienne couleur a été enregistrée ; les images de logo conservent leurs pixels. La couleur enregistrée reste intacte et les autres templates gardent leur personnalisation. Fusion et production autorisées par le propriétaire après ce dernier réglage.

### Sous-titre et cadre de téléphone — retour du 4 octobre

La couleur du sous-titre était écrasée en ligne par celle du logo : un logo blanc entraînait donc un sous-titre blanc. Suppression de ce couplage ; la teinte fixe est désormais `#efb866` et le bloc centré passe de 76 % à 60 % de la largeur. Un texte sans espaces se replie sans dépasser le bloc ; un sous-titre vide ne produit aucun élément.

La bande blanche provenait de la différence entre le ratio naturel 9:16 du décor et l’écran interne plus haut du téléphone du wizard. En aperçu compact seulement, le conteneur utilise toute la hauteur disponible et le décor couvre cette hauteur minimale. La roue reste carrée, conserve son diamètre et son animation ; aucun agrandissement vertical n’est appliqué aux segments.

![Aperçu dans le vrai cadre de téléphone, logo blanc et sous-titre doré](halloween-wheel-456-phone.webp)

Six tests supplémentaires réutilisent le composant `WizardPhoneFrame` réel (300 × 550 px), à 320/390/1280 px, sans sous-titre et avec un texte long non sécable : couverture du bas d’écran, largeur de 60 %, couleur dorée, roue carrée, images chargées et absence d’erreur navigateur. Le composant du cadre est seulement exporté pour la fixture ; aucun changement de structure ou de logique du wizard. Vérification totale : 28 tests navigateur et 3 tests unitaires, lint et build réussis.

### Retour Vercel et espacements — 4 octobre

La preview du commit `022b297` déployait bien le composant, mais pas ses images : `.vercelignore` excluait globalement `*.webp` sans exception pour Halloween. Fond et cadeau ont été contrôlés sur le déploiement `dpl_UHN4UM2zeDz986PE79H9oAQLJzJ7` : HTTP 404, `text/html`. La présence dans Git et le succès des tests locaux ne couvraient donc pas le packaging Vercel.

Correctif : exception limitée à `apps/web-app/public/images/templates/halloween-gold/*.webp`, sans élargir la publication aux pièces jointes ou originaux générés. Un test vérifie cette exception après l’exclusion globale ; le contrôle des dix images et des trois images optimisées doit également être rejoué sur la nouvelle preview avant de la présenter comme corrigée.

À la demande du propriétaire, la marge initiale sous le logo passe de 5 à 50 px et l’espacement initial avant la roue de 32 à 50 px, à partir de la constante commune des roues. Les valeurs déjà enregistrées, notamment 0 ou 5 px, restent prioritaires. Le centre est donc volontairement plus bas que dans la capture affinée précédente ; aucune réduction du diamètre, de la police ou modification de mécanique ne compense ce nouvel espacement.

![Espacements communs de 50 px, capture locale à 390 px](halloween-wheel-456-spacing.webp)

Vérifications locales du correctif : 22 tests Playwright, 3 tests unitaires de conservation des lots, lint sans erreur (4 avertissements préexistants) et build réussis. Le contrôle navigateur mesure 50 px pour les deux espacements à 390 px. Le serveur 3001 reste inchangé.

Créer un brouillon de roue, choisir « Halloween doré », comparer la capture à la référence, modifier le logo/titre/taille, puis revenir sur un autre template pour contrôler que ses espacements sont restaurés. Prévisualiser une campagne avec un lot de 50 %, jouer et vérifier le gain réel. Valider aussi le rendu du titre réel de l’établissement, qui peut différer du texte de démonstration.

Retour arrière : revert de la PR ; aucun changement de données métier à annuler. Les campagnes ayant sélectionné Halloween doivent être réaffectées à un modèle existant avant un retrait définitif de ce modèle.
