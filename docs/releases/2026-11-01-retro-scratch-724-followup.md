# Correctif du ticket rétro festif — #724

Le modèle rétro conserve les identifiants de campagne. Le logo texte est placé
dans un badge circulaire centré ; le titre Playfair est renforcé et le ticket
adopte une bordure de ticket vintage avec dents haut/bas et encoches latérales
arrondies. Son revêtement ivoire texturé reste opaque et sans gris.
Les quatre modèles illustrés reprennent aussi le macaron circulaire des références.
Le ticket rayons rétro garde son bord dentelé et ses encoches latérales ; les trois
autres gardent leur contour pinceau. La couche opaque, le canvas et la surface
partagent le même masque, repris également dans les miniatures. Les trois revêtements
dorés ont une texture plus proche du pinceau des références, sans motif feuillage
marqué sur le modèle noir & or. Le fond rétro est reconstruit avec
des rayons réguliers qui convergent au bord supérieur du ticket, un grain papier
plus perceptible et les teintes de la référence ; ce fond reste dans la bibliothèque.
La mention décorative « Ticket à gratter » est imprimée sur le revêtement des quatre
tickets et s'efface avec lui. Un fond clair dédié révèle le vrai libellé du gain,
avec une couleur lisible pour chaque design. L'espacement du ticket suit le réglage
entre le texte et la zone à gratter au lieu de centrer la zone dans l'espace restant.

Aucune règle de tirage ou donnée de campagne n'est modifiée. Le fond rayé natif et
la priorité d'un fond choisi manuellement sont conservés.

## Vérifications

- `npm run test:e2e -w @okado/web-app -- e2e/christmas-scratch.spec.ts`
- `npm run lint -w @okado/web-app`
- `npm run build -w @okado/web-app`
- Contrôle visuel des aperçus mobiles et aux résolutions 1280×720 et 1280×600.
