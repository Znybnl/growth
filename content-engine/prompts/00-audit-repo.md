# Prompt Codex — 00 / Audit du dépôt

Tu travailles sur le dépôt réel d'Okado. Commence par lire `AGENTS.md` et la compétence `.agents/skills/okado-blog/SKILL.md`.

Objectif : adapter le kit Content Engine aux conventions existantes **sans publier ni modifier le rendu public**.

1. Détermine le framework, les commandes de lint/test/build, le dossier des articles et le format (MDX/TSX/JSON/autre).
2. Détermine comment sont produits : route, slug, titre, description, canonical, Open Graph, sitemap, JSON-LD, dates et images.
3. Inventorie toutes les pages blog (titre, URL, intention de recherche, CTA, liens internes). Repère les sujets qui se chevauchent ; n'invente aucun volume de recherche.
4. Localise les pages produit pertinentes et les possibilités de preuve produit.
5. Vérifie la couverture et le comportement technique réels de robots.txt, sitemap, indexation et rendu HTML. Ne les modifie pas pendant cet audit.
6. Propose un plan d'intégration spécifique à ce dépôt, avec fichiers exacts à créer/adapter, checks testables et risques. Réutilise les composants existants.
7. Rédige un rapport versionné sous `content-engine/audit.md` et un inventaire sous `content-engine/roadmap/inventory.md`.

Ne commence PAS la génération massive d'articles. Signale les données et accès manquants (Search Console, analytics, recherche externe). Exécute uniquement des commandes de lecture ou des tests sans effets non souhaités.
