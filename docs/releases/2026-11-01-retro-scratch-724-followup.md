# Ajustement des tickets festifs — #724

Rayons rétro est retiré des sélecteurs de nouveaux modèles, car sa forme ne correspond
pas au design attendu. Son identifiant historique, son fond et son rendu restent disponibles
pour les campagnes qui l'utilisent déjà.

Les zones de grattage de Vert bouteille, Ivoire & champagne et Satin noir & or sont plus
hautes, un peu moins larges, aux bords moins irréguliers et inclinées d'environ un degré.
Le masque visible et le canvas interactif partagent la même forme. Aucun libellé générique
n'est affiché sur le revêtement ; après grattage, le gain est révélé sur un fond clair avec
une couleur lisible. L'espacement du ticket suit le réglage entre le texte et la zone à gratter.

Aucune règle de tirage ou donnée de campagne n'est modifiée. Le fond rayé natif et
la priorité d'un fond choisi manuellement sont conservés.

## Vérifications

- `npm run test:e2e -w @okado/web-app -- e2e/christmas-scratch.spec.ts`
- `npm run lint -w @okado/web-app`
- `npm run build -w @okado/web-app`
- Contrôle visuel des aperçus mobiles et aux résolutions 1280×720 et 1280×600.
