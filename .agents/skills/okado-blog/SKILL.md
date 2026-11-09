---
name: okado-blog
description: Auditer, planifier, rédiger ou actualiser le blog Okado dans son registre existant, avec sources et validation humaine.
---

# Blog Okado

Lire `AGENTS.md`, `content-engine/README.md`, les fichiers de `content-engine/knowledge/` et les règles produit applicables. Lancer `npm run content:inventory` et comparer les sujets existants avant de proposer création, enrichissement ou abandon. Travailler successivement comme stratège, documentaliste, rédacteur, auditeur et intégrateur ; aucun agent séparé n'est nécessaire. Consigner un brief structuré, les affirmations, les liens de sources primaires consultées et leurs dates réelles. Vérifier les fonctionnalités dans les documents produit et le code ; ne pas inventer chiffres, clients, capacités, conformité ou résultats. Signaler les arbitrages juridiques et les incertitudes. Utiliser le registre `apps/landing-page/src/lib/blog.ts` et les composants en place ; ne pas changer les URL existantes. Suivre les prompts dans `content-engine/prompts/` lorsqu'utiles, sans leur accorder priorité sur ces règles. Lancer `npm run content:briefs`, `npm run content:audit`, lint, build et tests de rendu adaptés. Distinguer BLOCKED, NEEDS_EDITS et READY_FOR_HUMAN_REVIEW selon `content-engine/README.md`. Toute affirmation, source, illustration, CTA, duplication et analyse réglementaire requiert une revue humaine ; un script ne les certifie pas. Ne pas fusionner, publier ou déployer sans autorisation explicite.

Pour une demande de plusieurs articles ou d'actualisation, appliquer content-engine/roadmap/workflow-lots.md et suivre chaque article séparément ; continuer les autres si un sujet est bloqué.
