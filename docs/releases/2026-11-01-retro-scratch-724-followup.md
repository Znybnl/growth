# Correctif du ticket rétro festif — #724

Le modèle rétro conserve les identifiants de campagne. Le logo texte est placé
dans un badge circulaire centré ; le titre Playfair est renforcé et le ticket
adopte une bordure de ticket vintage avec dents haut/bas et encoches latérales
arrondies. Son revêtement ivoire texturé reste opaque et sans gris.
La couche opaque, le canvas et la surface emploient désormais le même contour à
encoches pour le rétro et le même contour pinceau pour les trois autres modèles.
Les miniatures partagent également ce masque. Le fond rétro est reconstruit avec
des rayons réguliers qui convergent au bord supérieur du ticket, un grain papier
plus perceptible et les teintes de la référence ; ce fond reste dans la bibliothèque.
La mention décorative « Ticket à gratter » est imprimée sur le revêtement du ticket
rétro, et s'efface donc avec lui. Le vrai libellé du gain reste caché dessous et
se révèle pendant le grattage ; la mention générique ne le remplace pas.

Aucune règle de tirage ou donnée de campagne n'est modifiée. Le fond rayé natif et
la priorité d'un fond choisi manuellement sont conservés.

## Vérifications

- `npm run test:e2e -w @okado/web-app -- e2e/christmas-scratch.spec.ts`
- `npm run lint -w @okado/web-app`
- `npm run build -w @okado/web-app`
- Contrôle visuel des aperçus mobiles et aux résolutions 1280×720 et 1280×600.
