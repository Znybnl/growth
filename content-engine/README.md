# Okado Content Engine

Moteur local assisté par Codex, sans API IA ni publication automatique. Le catalogue reste `apps/landing-page/src/lib/blog.ts` ; un article ajouté à ce registre devient une route publique au prochain déploiement. Une branche ou PR n'est pas une prévisualisation privée : ne jamais fusionner ni déployer sans validation propriétaire.

## Utilisation

Demander à Codex « Analyse mon blog et propose 10 opportunités », « Prépare trois articles pour les salons de coiffure », « Actualise [URL] » ou « Audite [URL] ». Suivre la compétence `.agents/skills/okado-blog/SKILL.md`, et les sources produit et règles du dépôt. Réviser l'inventaire : `npm run content:inventory`. Contrôler un article : `npm run content:audit -- /blog/slug` ; tout le catalogue : `npm run content:audit`. Tester les contrôles : `npm run content:test`. Valider tous les briefs : `npm run content:briefs` ou `npm run content:briefs -- chemin/brief.json`. Les commandes s'exécutent depuis la racine.

## Processus

1. Inventorier, analyser les intentions et comparer au catalogue ; classer créer, enrichir ou abandonner, sans prétendre disposer de volumes de recherche non vérifiés.
2. Rédiger un brief JSON sur le modèle de `briefs/example.json` ; dossier de faits : affirmation, référence précise, preuve et date réelle de consultation. Aucun exemple fictif ne doit être présenté comme client réel.
3. Rechercher les sources primaires actuelles, vérifier les affirmations produit avec `docs/PRODUCT.md` et le code, signaler les incertitudes et les sujets juridiques à relire. Les références de méthode SEO ne prouvent pas les affirmations métier.
4. Rédiger et intégrer dans le catalogue existant uniquement si le contenu est prêt à être proposé à la validation ; conserver les URL existantes. Utiliser les composants et images existants, ou une illustration adaptée dont les droits sont clairs. Vérifier que CTA, liens et dates reflètent le contenu.
5. Auditer les faits, liens, duplication, risques et qualité ; corriger, puis exécuter les commandes de contrôle, lint, build et tests SEO appropriés. Fournir un diff et une recette au propriétaire.

## États

`BLOCKED` : preuve indispensable absente, risque réglementaire non résolu ou erreur technique bloquante. `NEEDS_EDITS` : corrections nécessaires ou vérifications en attente. `READY_FOR_HUMAN_REVIEW` : contrôles réalisés avec preuves et aucun point bloquant, sans préjuger de la validation humaine. Une validation automatique de structure ne valide ni la véracité ni la consultation de sources, ni les liens distants, la cannibalisation sémantique, le style, les CTA ou la conformité. Le vérificateur local analyse les destinations de contenu connues et fichiers publics ; les routes dynamiques ou ancres exigent une vérification humaine. Les tests de rendu vérifient canonical, sitemap et JSON-LD réellement servis.

## Suivi et maintenance

Actualiser l'inventaire après changement du registre ; comparer les performances par URL dans Search Console si le propriétaire fournit l'accès : clics, impressions, requêtes, période, pays et date d'extraction. Ne pas inférer causalité ou volume depuis ces seuls chiffres. Aucune connexion ni tâche planifiée n'est configurée. Avant évolution vers une API ou un calendrier, définir authentification, coûts, validation et permissions séparément. Le retour arrière consiste à retirer les fichiers du moteur et les étapes CI associées ; aucune migration ni donnée de production.

Comparer ponctuellement le registre au sitemap public : `node content-engine/scripts/engine.mjs compare-public`. Cette commande réseau signale également les brouillons locaux ; elle ne tourne pas au build et ne prouve pas que chaque page répond.
Un fichier sitemap déjà téléchargé peut être fourni en argument à `compare-public` si Node ne dispose pas de l’accès réseau ; indiquer la date et la provenance du fichier.

Pour un lot ou une actualisation, suivre content-engine/roadmap/workflow-lots.md. Générer une copie lisible depuis le registre avec node content-engine/scripts/reading-copy.mjs /blog/slug chemin.md.

## Demandes quotidiennes

Dans Codex, demander « Propose les cinq meilleures opportunités SEO », « Prépare trois nouveaux articles complets », « Actualise les articles qui nécessitent une mise à jour », « Analyse les doublons et le maillage interne » ou « Prépare les articles approuvés pour publication ». Actualiser l’inventaire, comparer les intentions et vérifier sources et fonctionnalités. Sans données Search Console, qualifier le classement d’hypothèse. Pour préparer une publication, contrôler l’approbation explicite de chaque article, les dates réelles, sources, liens et tests ; présenter le diff. Ne jamais fusionner ni déployer sans autorisation explicite. Voir `roadmap/search-console.md`.

**Attention — brouillons dans le registre :** le drapeau `draft` masque la date de publication et affiche « Brouillon — non publié » ; il ne retire pas les pages du catalogue ni du sitemap et ne bloque pas leur indexation. Ne pas fusionner ni déployer cette branche tant que chaque article inclus n’a pas été approuvé et préparé. Avant publication, fixer la vraie date, enlever `draft` et revérifier rendu et métadonnées.
