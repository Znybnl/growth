# Runbook de release des migrations Supabase

Ce runbook s'applique à toute migration Supabase déployée avec l'application Okado.
Il complète `docs/RELEASE_CHECKLIST.md` et ne contient aucun secret.

## 1. Préparer le candidat

1. Relier le candidat à un commit Git précis et noter son SHA.
2. Relire la migration et documenter son impact, sa compatibilité et son retour arrière.
3. Vérifier que la migration suit une stratégie **expand/contract** : l'ancien code doit rester compatible pendant la fenêtre de déploiement.
4. Vérifier que les fichiers de migration sont présents dans `supabase/migrations/` et qu'ils sont inclus dans la PR.

## 2. Sauvegarder avant migration

Avant toute migration sensible, identifier une sauvegarde Supabase horodatée ou réaliser un export logique avec `SUPABASE_DB_URL`, selon `docs/BACKUP_RESTORE.md`.

Conserver uniquement une preuve non sensible : date UTC, identifiant de sauvegarde, projet cible, commit applicatif et résultat. Ne jamais inscrire de clé, d'URL privée ou de donnée joueur dans Git ou GitHub.

## 3. Appliquer puis contrôler le schéma

Appliquer la migration sur la cible autorisée, puis exécuter depuis le commit candidat :

```bash
npm run check:supabase
npm run smoke:security
```

`check:supabase` doit vérifier les tables, colonnes, RPC et le refus des lectures anonymes attendus par le code. Une migration n'est pas certifiée parce que le fichier existe dans Git : le contrôle doit répondre sur la base cible.

En cas d'échec, ne pas déployer le code dépendant du nouveau schéma. Corriger la cible ou interrompre la release.

## 4. Déployer le code

Après le contrôle du schéma :

```bash
npm run check:dependencies
npm run check:gotomarket
npm run lint
npm run build:web
```

Déployer ensuite le commit candidat sur Vercel. Vérifier que le déploiement de production référence exactement le SHA contrôlé et que les routes critiques répondent.

## 5. Retour arrière

En cas de régression applicative, promouvoir le dernier déploiement Vercel sain. Ne jamais supposer qu'un rollback Vercel annule la migration Supabase.

Pendant la fenêtre de compatibilité, l'ancien code doit continuer à fonctionner avec le schéma étendu. Pour retirer une colonne ou une fonction, attendre que l'ancien code ne soit plus servi, puis réaliser une migration contract séparée et sauvegardée.

Si une migration non rétrocompatible a déjà été exécutée, restaurer d'abord sur un projet de rehearsal et préparer une migration corrective explicite. Ne pas exécuter de `DROP`, de purge ou de restauration destructive directement en production sans validation de Pierre-Henri BRUNELLE.

## 6. Preuve de release

Le compte rendu de la PR doit contenir :

- SHA testé et SHA déployé ;
- migrations appliquées et cible, sans secret ;
- résultat de `check:supabase`, du lint, du build et des smoke tests ;
- identifiant non sensible de la sauvegarde ;
- URL/ID du déploiement Vercel et statut ;
- résultat du smoke test post-déploiement ;
- procédure de rollback applicable.
