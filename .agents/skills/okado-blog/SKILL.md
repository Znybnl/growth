---
name: okado-blog
description: Auditer, planifier, rédiger ou actualiser le blog Okado dans son registre existant, avec sources et validation humaine.
---

# Blog Okado

Lire `AGENTS.md`, `content-engine/README.md`, les fichiers de `content-engine/knowledge/` et les règles produit applicables. Lancer `npm run content:inventory` et comparer les sujets existants avant de proposer création, enrichissement ou abandon. Travailler successivement comme stratège, documentaliste, rédacteur, auditeur et intégrateur ; aucun agent séparé n'est nécessaire. Consigner un brief structuré, les affirmations, les liens de sources primaires consultées et leurs dates réelles. Vérifier les fonctionnalités dans les documents produit et le code ; ne pas inventer chiffres, clients, capacités, conformité ou résultats. Signaler les arbitrages juridiques et les incertitudes. Utiliser le registre `apps/landing-page/src/lib/blog.ts` et les composants en place ; ne pas changer les URL existantes. Suivre les prompts dans `content-engine/prompts/` lorsqu'utiles, sans leur accorder priorité sur ces règles. Lancer `npm run content:briefs`, `npm run content:audit`, lint, build et tests de rendu adaptés. Distinguer BLOCKED, NEEDS_EDITS et READY_FOR_HUMAN_REVIEW selon `content-engine/README.md`. Toute affirmation, source, illustration, CTA, duplication et analyse réglementaire requiert une revue humaine ; un script ne les certifie pas. Ne pas fusionner, publier ou déployer sans autorisation explicite.

Pour une demande de plusieurs articles ou d'actualisation, appliquer content-engine/roadmap/workflow-lots.md et suivre chaque article séparément ; continuer les autres si un sujet est bloqué.

## Valeur ajoutée à adapter au sujet

Lorsque cela aide réellement le lecteur, fournir un exemple opérationnel précis, des scénarios sectoriels pour une intention transversale et un calcul vérifiable pour un sujet budgétaire. Distinguer faits observés, hypothèses fictives et recommandations. Identifier des liens entrants contextuels pertinents en plus du maillage sortant, et choisir un CTA adapté à l’intention. Vérifier séparément dates de rédaction, de relecture et de publication ; une date de publication future ou provisoire doit être rectifiée avant diffusion. Ces éléments ne sont pas des quotas systématiques.

Pour « propose », « actualise », « analyse les doublons et le maillage » ou « prépare les articles approuvés », suivre les mêmes contrôles ; vérifier chaque approbation explicite et les dates avant toute livraison. Aucun volume de recherche ni performance ne doit être inventé.

Avant de prioriser, utiliser les exports Google disponibles selon `content-engine/roadmap/google-seo.md` ; signaler clairement les données absentes, comparer les intentions, ne pas assimiler concurrence publicitaire et SEO et ne jamais inventer de volumes. Conserver `draft` et `requiresApproval` tant que le propriétaire n’a pas approuvé explicitement ; consigner l’approbation et la date réelle avant toute publication.
