# Lisibilité des replays — complément #755

## Diagnostic

La correction #756 rétablissait le cadrage rrweb, mais sa vérification portait
sur les paquets enregistrés, sans reconstruction visuelle. Le filtre d’attributs
supprimait toute la liste de classes dès qu’elle contenait des crochets Tailwind.
La navigation utilise notamment `w-[248px]`, une ombre et `lg:ml-[248px]`.
Dans le bloc d’une session de recette stockée dans le projet 212872 EU, les trois
nœuds `aside` inspectés avaient tous une classe vide, malgré la présence du CSS.
Le masquage des textes fixes était également trop restrictif.

## Correction et limites

- Filtrage classe par classe, conservation des valeurs et variantes de mise en
  page, rejet des URL, contenus arbitraires et variables privées.
- Conservation des états UI finis utilisés par les sélecteurs CSS et des icônes
  Lucide du produit. Les SVG libres, images importées et graphiques restent bloqués.
- Libellés fixes de navigation, accueil et formulaires lisibles. Seuls les nombres
  des cartes KPI agrégées bénéficient d’une exception contextuelle. Les autres
  nombres, saisies et contenus libres restent masqués.
- Aucun changement de projet, de consentement, d’éligibilité ou de durée de
  conservation. Aucune migration SQL. Le lecteur de test est une dépendance de
  développement, sans ajout au parcours marchand de production.

Les classes et textes jamais transmis dans les anciens enregistrements ne peuvent
pas être récupérés. Le contrôle final en production doit porter sur une nouvelle
session après déploiement.

## Vérification

`e2e/beta-replay.spec.ts` utilise le SDK PostHog installé et intercepte son trafic.
La fixture monte le vrai `MerchantShell`. Les snapshots produits sont décompressés
puis lus dans un **lecteur rrweb indépendant**, sans accès au DOM d’origine.
Les tests comparent la largeur et la position de la navigation, la présence de ses
icônes, du titre et des KPI, ainsi que le déplacement du contenu. Captures à
1280×720, 1280×600 et 390×844 avec ouverture du menu mobile. Les secrets fictifs
doivent rester absents des paquets.

Commandes : `npm run test:beta-replay -w @okado/web-app`, `npm run lint:web`,
`npm run build:web -- --webpack` et, dans `apps/web-app`,
`npx playwright test e2e/beta-replay.spec.ts` avec serveur local configuré.

Résultats locaux : 8 tests unitaires et les 13 scénarios navigateur validés,
dont les trois reconstructions inspectées visuellement. TypeScript, build Webpack,
vérification UTF-8, cohérence du lockfile (`npm ci --dry-run --ignore-scripts`)
et audit des dépendances complets valides. Le lint conserve quatre avertissements
préexistants hors périmètre et aucune erreur. L'audit conserve uniquement
l'exception faible de développement déjà documentée pour shadcn.

Après déploiement autorisé, ouvrir une nouvelle session SaaS de test, naviguer
Accueil → Campagnes, puis contrôler la navigation et les textes fixes dans le
lecteur PostHog du projet 212872. Les noms, adresses et contenus libres doivent
rester masqués. Retour arrière par revert de la PR, ou arrêt global via la phase
`public` conformément au runbook bêta.

Référence fournisseur : [confidentialité des replays](https://posthog.com/docs/session-replay/privacy).
