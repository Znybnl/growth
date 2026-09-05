# Bibliothèque de visuels de fond

Les visuels intégrés de la bibliothèque sont des fonds abstraits verticaux, sans texte, logo, marque ni symbole lisible. Ils sont conçus pour un affichage mobile en portrait et conservent une zone centrale calme pour le logo, le texte principal et le mécanisme du jeu.

Les assets intégrés sont servis depuis `apps/web-app/public/backgrounds/` au format SVG, en 1024 × 1536 (ratio 2:3). Ce format permet de conserver des fichiers légers et nets sur les écrans haute densité. Les fonds téléversés par un administrateur sont, eux, convertis en WebP et accompagnés d'une miniature dédiée par `background-library-repository.ts`.

| Visuel | Catégorie | Fichier |
| --- | --- | --- |
| Aurora Retail | Retail | `aurora-retail.svg` |
| Sunset Dining | Food | `sunset-dining.svg` |
| Midnight Neon | Gaming | `midnight-neon.svg` |
| Soft Studio | Beauty | `soft-studio.svg` |
| Terracotta Bistro | Restauration | `terracotta-bistro.svg` |
| Lemon Market | Commerce | `lemon-market.svg` |
| Coral Ritual | Beauté & bien-être | `coral-ritual.svg` |
| Cobalt Celebration | Événementiel | `cobalt-celebration.svg` |
| Mint Botanica | Commerce | `mint-botanica.svg` |
| Lavender Atelier | Beauté & bien-être | `lavender-atelier.svg` |
| Sandy Escape | Loisirs | `sandy-escape.svg` |
| Fuchsia Play | Loisirs | `fuchsia-play.svg` |

Les visuels restent des fonds de production : ils ne modifient ni les routes, ni les APIs, ni les permissions. Ils apparaissent dans la bibliothèque administrateur et dans les sélecteurs de fond du wizard et de l'éditeur classique via le registre partagé `background-library.ts`.
