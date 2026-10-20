# Page Beauté : démo plus proche et vrai fond Rose poudré — #608

## Constat et périmètre

Les suppressions « Une attention, juste pour vous », « Saisies non transmises. »
et « Essayez ici » étaient déjà présentes dans la PR #606 rattachée à #605.
Les tests permanents en vérifiaient l’absence. En revanche, le fond était une
palette #fff7f8 avec un voile blanc, et non l’image satinée/pétales du modèle
Rose poudré livré dans #462. Cette distinction explique la prise en compte
partielle de la demande ; il ne s’agit pas ici uniquement d’un onglet ancien.

Le propriétaire demande le 20 octobre de retirer le téléphone du hero Beauté
et de déplacer ou masquer le rappel tarifaire pour atteindre la démo plus tôt.
Ce complément est inclus dans la branche/PR #606, sans autorisation de merge
ou production.

## Réalisation

- Hero Beauté sans capture de téléphone, titre et description plus compacts.
  L’essai et Voir la démo restent disponibles ; le lien vers les six spécialités
  rejoint les actions. Les trois réassurances secondaires ne doublent plus
  le contenu au-dessus de la démo. La bannière d’essai globale reste présente.
- Rappel « 20 € HT/mois · 30 jours d’essai sans carte » placé **après** la démo,
  une seule fois, sans modifier le prix ni le contenu. Restaurants conserve
  sa disposition et ses réassurances.
- Réutilisation exacte de `apps/web-app/public/images/wheel-templates/beauty-rose-satin.webp`
  dans `apps/landing-page/public/images/beauty-rose-satin.webp` (53 056 octets,
  SHA-256 `8f523fc47573ba9e1936bdf211ca99f81fa3977d73c556e801c2f6b0c7cc100d`).
  Copie d’asset existant, aucune nouvelle génération d’image. L’import statique
  donne une URL avec empreinte ; l’exception WebP de la configuration Vercel
  existante le couvre. Aucune URL distante ou dépendance au domaine SaaS.
- L’image couvre le téléphone Beauté entier ; son écran devient transparent
  au lieu de masquer le fond avec un dégradé blanc. Les formulaires gardent
  leur panneau clair pour la lisibilité. Autres variantes inchangées.

Aucun ajout de hook, dépendance, route métier, collecte, compte, tirage, lot
réel, stock, e-mail ou consentement. Le H1, les métadonnées, articles et liens
restent présents. L’asset est décoratif, sans texte significatif à décrire.
Checklist React : rendu conditionnel local, pas d’état dupliqué ni d’effet,
image statique et contrôles clavier conservés.

## Vérification et recette

Lint et build landing réalisés, pages toujours statiques (58 entrées).
`beauty-demo-access.spec.ts` vérifie l’ordre réel du DOM Beauté/Restaurants,
l’absence de téléphone-image dans le hero, le fond et son chargement HTTP 200,
son type WebP et sa taille réelle, l’absence de voile blanc et des trois mentions,
y compris pour une spécialité. Matrice capturée : 320×740, 390×844, 768×1024,
1280×720, 1280×600 et 1440×900, avec le vrai en-tête de navigation.
La suite `landing-demo` contrôle aussi la propriété calculée du fond et les
parcours complets ; identité/CTA, spécialités et conversion sont rejoués.

Résultats : lint/build landing et `npm run verify:source` réussis.
`beauty-demo-access`, `landing-demo`, `marketing-brand-faq`, `product-proof`
et `landing-conversion` sur les quatre projets Playwright : **73 réussis,
3 sauts intentionnels** (matrice visuelle exécutée une fois). Les sept tests
SEO desktop sont validés : six au premier passage et le lot « chaque page
publique » après relance isolée en **41,9 s**. Ce lot avait dépassé sa limite
de 60 s pendant l’exécution parallèle des autres suites, sans assertion de
contenu en échec ; la relance garde le timeout existant, sans élargir le test.
Clé de mesure synthétique, paquets interceptés et consentement refusé dans les
fixtures : aucun test n’est envoyé à PostHog ou à une API métier.

Captures locales de la matrice :
`apps/landing-page/test-results/beauty-demo-access--visual-*/` (regénérables par
la suite). Preuves de l’onglet utilisateur rechargé et inspecté :
`apps/landing-page/test-results/beauty-608-browser-demo.jpg` et
`beauty-608-browser-top.jpg`.

Dans l’onglet utilisateur réellement ouvert, avant rechargement : téléphone
dans le hero, aucun background-image sur la démo, ancre #demo à 984 px dans
le document. Après rechargement : aucun téléphone-image dans le hero,
background-image sur le vrai fichier `beauty-rose-satin.*.webp`, ancre à 467 px,
soit 517 px plus haut dans cette fenêtre. Cette mesure locale n’est ni un gain
de conversion ni une promesse identique sur toutes les largeurs.

Recette : ouvrir /instituts-beaute et recharger après le build, vérifier la
présentation courte, ouvrir Voir la démo et comparer le fond au vrai modèle,
jouer, lire la confirmation/e-mail, puis vérifier le rappel tarifaire plus bas.
Contrôler aussi un lot depuis une spécialité et Restaurants inchangé.

Risques : recadrage du fond et contraste sur les bords, hauteur responsive.
Captures inspectées sur ordinateur/mobile et vérification de non-débordement.
Les longs contenus restent défilants ; aucun écran complet n’est promis dans
720 px de hauteur. Revert du commit de ce complément pour revenir en arrière,
aucune restauration de données nécessaire. Validation propriétaire avant
fusion/production.
